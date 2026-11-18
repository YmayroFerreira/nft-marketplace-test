import { delay, http, HttpResponse } from 'msw'
import type { CollectorDetails, CreateOrderRequest, Order } from '@/types/account'
import type { Network } from '@/types/catalog'
import { scaleEth } from '@/lib/eth'
import { commit, getCart, getDb, nextId, touchCart, type StoredOrder } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { publishNftUpdated, publishOrderUpdated } from '../realtime'
import { getScenario } from '../scenarios'
import { findEdition } from './cart'
import { issueQuote, sameQuote, toQuote } from './checkout'

/** Time from `pending` to `processing`, and from `processing` to the final status */
const PROCESSING_DELAY_MS = 1500
const SETTLEMENT_DELAY_MS = 2500
/** Longer than the 15 s timeout of the API client (`order-timeout` scenario) */
const LOST_RESPONSE_DELAY_MS = 20_000

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+()\s-]{8,20}$/

/** Users whose quote was already changed in the `quote-changes` scenario (once per page load) */
const quoteChangedFor = new Set<string>()

function toOrder(stored: StoredOrder): Order {
  const { userId: _userId, idempotencyKey: _key, request: _request, ...order } = stored
  return order
}

function randomTxHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

function update(order: StoredOrder, changes: Partial<StoredOrder>) {
  Object.assign(order, changes, { version: order.version + 1, updatedAt: new Date().toISOString() })
  commit()
  publishOrderUpdated(order)
}

/** After confirmation, only the purchased copies leave the cart; anything added meanwhile stays */
function removePurchasedFromCart(order: StoredOrder) {
  const cart = getCart(order.userId)
  for (const item of order.items) {
    const line = cart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
    if (line) line.quantity -= item.quantity
  }
  cart.items = cart.items.filter((line) => line.quantity > 0)
  if (cart.items.length === 0) cart.promoCode = null
  touchCart(cart)
}

function settle(order: StoredOrder) {
  if (getScenario().checkoutFails) {
    // Payment refused: the cart was never touched, so the items are still there
    update(order, { status: 'failed', failureReason: 'A transação foi recusada pela rede. Nenhum valor foi cobrado.' })
    return
  }

  // Confirmed: the purchased copies leave the stock of their edition and the cart
  const db = getDb()
  for (const item of order.items) {
    const nft = db.nfts[item.nftId]
    const edition = findEdition(nft, item.editionId)
    if (!nft || !edition) continue
    edition.available = Math.max(0, edition.available - item.quantity)
    nft.availableEditions = nft.editions.reduce((sum, e) => sum + e.available, 0)
    nft.version += 1
    publishNftUpdated(nft)
  }
  removePurchasedFromCart(order)
  update(order, { status: 'confirmed', transactionHash: randomTxHash() })
}

/** Moves an order through pending → processing → confirmed/failed, emitting `order.updated` */
function scheduleProgress(order: StoredOrder) {
  if (order.status === 'pending') {
    setTimeout(() => {
      update(order, { status: 'processing' })
      setTimeout(() => settle(order), SETTLEMENT_DELAY_MS)
    }, PROCESSING_DELAY_MS)
  } else if (order.status === 'processing') {
    setTimeout(() => settle(order), SETTLEMENT_DELAY_MS)
  }
}

/** Orders left unfinished by a page reload continue when the mocks start again */
export function resumePendingOrders() {
  for (const order of Object.values(getDb().orders)) scheduleProgress(order)
}

function validateCollector(collector: Partial<CollectorDetails> | undefined) {
  const fields: Record<string, string> = {}
  const fullName = collector?.fullName?.trim() ?? ''
  const email = collector?.email?.trim() ?? ''
  const phone = collector?.phone?.trim() ?? ''
  if (fullName.length < 3 || !fullName.includes(' ')) fields['collector.fullName'] = 'Informe nome e sobrenome.'
  if (!EMAIL_PATTERN.test(email)) fields['collector.email'] = 'Informe um e-mail válido.'
  if (phone && !PHONE_PATTERN.test(phone)) fields['collector.phone'] = 'Informe um telefone válido.'
  return { fields, collector: { fullName, email, ...(phone ? { phone } : {}) } }
}

/** A retry asks for the same purchase; a new quote is accepted if it has the same items and total */
function isSameAttempt(order: StoredOrder, body: Partial<CreateOrderRequest> | null) {
  const quote = body?.quoteId ? getDb().quotes[body.quoteId] : undefined
  const sameQuote =
    body?.quoteId === order.request.quoteId ||
    (quote?.userId === order.userId &&
      quote.total === order.total &&
      JSON.stringify(quote.items) === JSON.stringify(order.items))
  return (
    sameQuote &&
    body?.walletId === order.request.walletId &&
    body?.network === order.request.network &&
    JSON.stringify(validateCollector(body?.collector).collector) === JSON.stringify(order.request.collector)
  )
}

/** 409 with a fresh quote: the client must show the new values and ask again */
function quoteChanged(userId: string, message: string) {
  const result = issueQuote(userId)
  if ('error' in result) return result.error
  return HttpResponse.json(
    { error: { code: 'quote_changed', message }, quote: toQuote(result.quote) },
    { status: 409 },
  )
}

/** Simulates market activity between review and confirmation (`quote-changes` scenario) */
function maybeChangePrice(userId: string, quoteNftId: string | undefined) {
  if (!getScenario().quoteChanges || quoteChangedFor.has(userId) || !quoteNftId) return
  const nft = getDb().nfts[quoteNftId]
  if (!nft) return
  quoteChangedFor.add(userId)
  for (const edition of nft.editions) edition.price = scaleEth(edition.price, 11, 10, 4)
  nft.price = nft.editions.find((e) => e.id === nft.defaultEditionId)?.price ?? nft.price
  nft.version += 1
  commit()
  publishNftUpdated(nft)
}

export const ordersHandlers = [
  http.post(`${API}/orders`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error
    const userId = auth.user.id

    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return apiError(400, 'missing_idempotency_key', 'O cabeçalho Idempotency-Key é obrigatório.')
    }

    const db = getDb()
    const body = await readJson<CreateOrderRequest>(request)

    // Same key from the same user (double click, retry after a timeout): same order
    const existing = Object.values(db.orders).find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey)
    if (existing) {
      if (!isSameAttempt(existing, body)) {
        return apiError(409, 'idempotency_conflict', 'Esta tentativa de compra já foi usada com outros dados.')
      }
      return HttpResponse.json(toOrder(existing), { status: 200 })
    }

    // One purchase at a time: a new attempt while another is in progress would buy the same items twice
    const inProgress = Object.values(db.orders).find(
      (o) => o.userId === userId && (o.status === 'pending' || o.status === 'processing'),
    )
    if (inProgress) {
      return HttpResponse.json(
        {
          error: { code: 'order_in_progress', message: 'Você já tem um pedido sendo processado.' },
          orderId: inProgress.id,
        },
        { status: 409 },
      )
    }

    const { fields, collector } = validateCollector(body?.collector)
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Confira seus dados.', fields)

    const wallet = (db.wallets[userId] ?? []).find((w) => w.id === body?.walletId)
    if (!wallet) {
      return apiError(422, 'validation_error', 'Selecione uma carteira válida.', { walletId: 'Selecione uma carteira válida.' })
    }

    const network = body?.network as Network | undefined
    const connection = body?.connectionId ? db.walletConnections[body.connectionId] : undefined
    const connectionValid =
      connection &&
      connection.userId === userId &&
      connection.walletId === wallet.id &&
      connection.network === network &&
      Date.parse(connection.expiresAt) > Date.now()
    if (!connectionValid || getScenario().walletDisconnects) {
      if (connection) delete db.walletConnections[connection.id]
      commit()
      return apiError(409, 'wallet_disconnected', 'A carteira foi desconectada. Conecte novamente para confirmar.')
    }

    const quote = body?.quoteId ? db.quotes[body.quoteId] : undefined
    if (!quote || quote.userId !== userId) {
      return quoteChanged(userId, 'Revise o pedido antes de confirmar.')
    }
    if (Date.parse(quote.expiresAt) < Date.now()) {
      return quoteChanged(userId, 'A cotação expirou. Confira os valores atualizados.')
    }

    maybeChangePrice(userId, quote.items[0]?.nftId)

    // Revalidate price, stock, coupon and fees against the current data
    const fresh = issueQuote(userId)
    if ('error' in fresh) return fresh.error
    if (fresh.quote.cartVersion !== quote.cartVersion || !sameQuote(fresh.quote, quote)) {
      return HttpResponse.json(
        {
          error: { code: 'quote_changed', message: 'Os valores mudaram desde a revisão. Confira e confirme novamente.' },
          quote: toQuote(fresh.quote),
        },
        { status: 409 },
      )
    }
    delete db.quotes[fresh.quote.id]

    const now = new Date().toISOString()
    // The receipt is a snapshot of the quote: later catalog changes never alter it
    const order: StoredOrder = {
      id: nextId('order'),
      userId,
      idempotencyKey,
      request: { quoteId: quote.id, walletId: wallet.id, network: connection.network, collector },
      status: 'pending',
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      wallet: {
        id: wallet.id,
        label: wallet.label,
        provider: wallet.provider,
        network: wallet.network,
        address: wallet.address,
      },
      network: connection.network,
      collector,
      transactionHash: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }
    db.orders[order.id] = order
    delete db.quotes[quote.id]
    // The cart is NOT emptied here: purchased copies are removed only on confirmation
    commit()

    scheduleProgress(order)
    if (getScenario().orderTimeout) await delay(LOST_RESPONSE_DELAY_MS)
    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  http.get(`${API}/orders`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const orders = Object.values(getDb().orders)
      .filter((o) => o.userId === auth.user.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(toOrder)
    return HttpResponse.json(orders)
  }),

  http.get(`${API}/orders/:id`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const order = getDb().orders[String(params.id)]
    // Another user's order answers 404, so its existence is not revealed
    if (!order || order.userId !== auth.user.id) return apiError(404, 'not_found', 'Pedido não encontrado.')
    return HttpResponse.json(toOrder(order))
  }),
]
