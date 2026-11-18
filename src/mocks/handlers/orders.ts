import { http, HttpResponse } from 'msw'
import type { CreateOrderRequest, Order } from '@/types/account'
import { commit, getCart, getDb, nextId, touchCart, type StoredOrder } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { publishNftUpdated, publishOrderUpdated } from '../realtime'
import { getScenario } from '../scenarios'
import { findEdition, toCart } from './cart'

/** Time from `pending` to `processing`, and from `processing` to the final status */
const PROCESSING_DELAY_MS = 1500
const SETTLEMENT_DELAY_MS = 2500

function toOrder(stored: StoredOrder): Order {
  const { userId: _userId, idempotencyKey: _key, ...order } = stored
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

function settle(order: StoredOrder) {
  const db = getDb()

  if (getScenario().checkoutFails) {
    // Payment failed: give the items back to the user's cart
    const cart = getCart(order.userId)
    for (const item of order.items) {
      const existing = cart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
      if (existing) existing.quantity += item.quantity
      else cart.items.push({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity })
    }
    touchCart(cart)
    update(order, { status: 'failed', failureReason: 'A transação foi recusada pela rede. Nenhum valor foi cobrado.' })
    return
  }

  // Confirmed: the purchased copies leave the stock of their edition
  for (const item of order.items) {
    const nft = db.nfts[item.nftId]
    const edition = findEdition(nft, item.editionId)
    if (!nft || !edition) continue
    edition.available = Math.max(0, edition.available - item.quantity)
    nft.availableEditions = nft.editions.reduce((sum, e) => sum + e.available, 0)
    nft.version += 1
    publishNftUpdated(nft)
  }
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
    // Same key from the same user: return the order created the first time
    const existing = Object.values(db.orders).find(
      (o) => o.userId === userId && o.idempotencyKey === idempotencyKey,
    )
    if (existing) return HttpResponse.json(toOrder(existing), { status: 200 })

    const body = await readJson<CreateOrderRequest>(request)
    const wallet = (db.wallets[userId] ?? []).find((w) => w.id === body?.walletId)
    if (!wallet) {
      return apiError(422, 'validation_error', 'Selecione uma carteira válida.', {
        walletId: 'Selecione uma carteira válida.',
      })
    }

    const cart = toCart(userId)
    if (cart.items.length === 0) return apiError(409, 'cart_empty', 'Seu carrinho está vazio.')
    if (body?.cartVersion !== cart.version) {
      return HttpResponse.json(
        { error: { code: 'cart_changed', message: 'Seu carrinho mudou. Revise os itens antes de pagar.' }, cart },
        { status: 409 },
      )
    }
    const unavailable = cart.items.find((item) => item.quantity > item.available)
    if (unavailable) {
      return apiError(
        409,
        'insufficient_editions',
        `Só restam ${unavailable.available} cópias da edição ${unavailable.editionLabel} de ${unavailable.name}.`,
      )
    }

    const now = new Date().toISOString()
    const order: StoredOrder = {
      id: nextId('order'),
      userId,
      idempotencyKey,
      status: 'pending',
      items: cart.items.map(({ available: _available, ...item }) => item),
      subtotal: cart.subtotal,
      discount: cart.discount,
      networkFee: cart.networkFee,
      total: cart.total,
      wallet: {
        id: wallet.id,
        label: wallet.label,
        provider: wallet.provider,
        network: wallet.network,
        address: wallet.address,
      },
      transactionHash: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }
    db.orders[order.id] = order

    // The cart is emptied when the order is created
    const storedCart = getCart(userId)
    storedCart.items = []
    storedCart.promoCode = null
    touchCart(storedCart)
    commit()

    scheduleProgress(order)
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
