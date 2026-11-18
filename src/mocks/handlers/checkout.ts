import { http, HttpResponse } from 'msw'
import type { CheckoutQuote, OrderItem } from '@/types/account'
import type { Network } from '@/types/catalog'
import { commit, getDb, nextId, type StoredQuote } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { getScenario } from '../scenarios'
import { toCart } from './cart'

const QUOTE_TTL_MS = 5 * 60 * 1000
const CONNECTION_TTL_MS = 15 * 60 * 1000
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

export function toQuote(stored: StoredQuote): CheckoutQuote {
  const { userId: _userId, ...quote } = stored
  return quote
}

/**
 * Issues a quote for the user's current cart, or an API error if the cart
 * cannot be bought as it is (empty, or more copies than in stock).
 */
export function issueQuote(userId: string): { quote: StoredQuote } | { error: Response } {
  const cart = toCart(userId)
  if (cart.items.length === 0) return { error: apiError(409, 'cart_empty', 'Seu carrinho está vazio.') }

  const unavailable = cart.items.find((item) => item.quantity > item.available)
  if (unavailable) {
    return {
      error: apiError(
        409,
        'insufficient_editions',
        unavailable.available === 0
          ? `A edição ${unavailable.editionLabel} de ${unavailable.name} esgotou. Ajuste o carrinho.`
          : `Só restam ${unavailable.available} cópias da edição ${unavailable.editionLabel} de ${unavailable.name}. Ajuste o carrinho.`,
      ),
    }
  }

  const items: OrderItem[] = cart.items.map(({ available: _available, ...item }) => item)
  const quote: StoredQuote = {
    id: nextId('quote'),
    userId,
    items,
    promoCode: cart.promoCode,
    subtotal: cart.subtotal,
    discount: cart.discount,
    networkFee: cart.networkFee,
    total: cart.total,
    cartVersion: cart.version,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
  getDb().quotes[quote.id] = quote
  commit()
  return { quote }
}

/** True when two quotes would charge exactly the same thing */
export function sameQuote(a: CheckoutQuote, b: CheckoutQuote) {
  const key = (q: CheckoutQuote) =>
    JSON.stringify([
      q.items.map((i) => [i.nftId, i.editionId, i.quantity, i.unitPrice, i.lineTotal]),
      q.promoCode,
      q.subtotal,
      q.discount,
      q.networkFee,
      q.total,
    ])
  return key(a) === key(b)
}

export const checkoutHandlers = [
  /** Review step: freezes the values the user is about to confirm */
  http.post(`${API}/checkout/quote`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const result = issueQuote(auth.user.id)
    if ('error' in result) return result.error
    return HttpResponse.json(toQuote(result.quote), { status: 201 })
  }),

  /** Simulated wallet connection (like the MetaMask / WalletConnect approval prompt) */
  http.post(`${API}/wallets/:id/connect`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const db = getDb()
    const wallet = (db.wallets[auth.user.id] ?? []).find((w) => w.id === String(params.id))
    if (!wallet) return apiError(404, 'not_found', 'Carteira não encontrada.')

    const body = await readJson<{ network: Network }>(request)
    const network = body?.network
    if (!network || !NETWORKS.includes(network)) {
      return apiError(422, 'validation_error', 'Selecione uma rede.', { network: 'Selecione uma rede.' })
    }
    if (getScenario().walletRejects) {
      return apiError(403, 'wallet_rejected', 'A conexão foi recusada na carteira. Tente novamente.')
    }

    const now = Date.now()
    const connection = {
      id: nextId('connection'),
      userId: auth.user.id,
      walletId: wallet.id,
      network,
      connectedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CONNECTION_TTL_MS).toISOString(),
    }
    db.walletConnections[connection.id] = connection
    commit()
    const { userId: _userId, ...publicConnection } = connection
    return HttpResponse.json(publicConnection, { status: 201 })
  }),

  http.delete(`${API}/wallet-connections/:id`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const db = getDb()
    const connection = db.walletConnections[String(params.id)]
    if (connection?.userId === auth.user.id) {
      delete db.walletConnections[connection.id]
      commit()
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
