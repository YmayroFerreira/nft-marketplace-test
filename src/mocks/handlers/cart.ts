import { http, HttpResponse } from 'msw'
import type { Cart, UpdateCartItemRequest } from '@/types/account'
import { commit, getCart, getDb, touchCart } from '../db'
import { API, apiError, eth, readJson, requireUser, simulateNetwork } from '../http-utils'

export const NETWORK_FEE = 0.016

/** Fictitious promo codes, documented in the README */
const PROMO_CODES: Record<string, (subtotal: number) => number> = {
  KURIO10: (subtotal) => subtotal * 0.1,
  GENESIS: () => 0.05,
}

/** Builds the public cart, recomputing prices from the current NFT data */
export function toCart(userId: string): Cart {
  const stored = getCart(userId)
  const nfts = getDb().nfts
  const items = stored.items
    .filter((item) => nfts[item.nftId])
    .map((item) => {
      const nft = nfts[item.nftId]
      return {
        nftId: nft.id,
        name: nft.name,
        imageUrl: nft.imageUrl,
        tokenId: nft.tokenId,
        unitPrice: nft.price,
        quantity: item.quantity,
        lineTotal: eth(nft.price * item.quantity),
        availableEditions: nft.availableEditions,
      }
    })
  const subtotal = eth(items.reduce((sum, item) => sum + item.lineTotal, 0))
  const discount = stored.promoCode ? eth(Math.min(subtotal, PROMO_CODES[stored.promoCode]?.(subtotal) ?? 0)) : 0
  const networkFee = items.length ? NETWORK_FEE : 0

  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    promoCode: stored.promoCode,
    subtotal,
    discount,
    networkFee,
    total: eth(subtotal - discount + networkFee),
    version: stored.version,
    updatedAt: stored.updatedAt,
  }
}

function versionConflict(userId: string) {
  return HttpResponse.json(
    {
      error: { code: 'cart_conflict', message: 'Seu carrinho mudou em outra aba. Revise os itens.' },
      cart: toCart(userId),
    },
    { status: 409 },
  )
}

export const cartHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    return HttpResponse.json(toCart(auth.user.id))
  }),

  /** Sets the quantity of an NFT in the cart (adds it if missing; 0 removes it) */
  http.put(`${API}/cart/items/:nftId`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const nft = getDb().nfts[String(params.nftId)]
    if (!nft) return apiError(404, 'not_found', 'NFT não encontrado.')

    const body = await readJson<UpdateCartItemRequest>(request)
    const quantity = Number(body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      return apiError(422, 'validation_error', 'Quantidade inválida.', { quantity: 'Quantidade inválida.' })
    }

    const cart = getCart(auth.user.id)
    if (body?.expectedVersion !== undefined && body.expectedVersion !== cart.version) {
      return versionConflict(auth.user.id)
    }
    if (quantity > nft.availableEditions) {
      return apiError(
        409,
        'insufficient_editions',
        `Só restam ${nft.availableEditions} edições de ${nft.name}.`,
        { quantity: `Máximo de ${nft.availableEditions} edições.` },
      )
    }

    const existing = cart.items.find((item) => item.nftId === nft.id)
    if (quantity === 0) cart.items = cart.items.filter((item) => item.nftId !== nft.id)
    else if (existing) existing.quantity = quantity
    else cart.items.push({ nftId: nft.id, quantity })

    touchCart(cart)
    commit()
    return HttpResponse.json(toCart(auth.user.id))
  }),

  http.delete(`${API}/cart/items/:nftId`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const cart = getCart(auth.user.id)
    cart.items = cart.items.filter((item) => item.nftId !== String(params.nftId))
    touchCart(cart)
    commit()
    return HttpResponse.json(toCart(auth.user.id))
  }),

  http.post(`${API}/cart/promo`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const body = await readJson<{ code: string }>(request)
    const code = body?.code?.trim().toUpperCase() ?? ''
    if (!PROMO_CODES[code]) {
      return apiError(422, 'invalid_promo_code', 'Código promocional inválido.', {
        code: 'Código promocional inválido.',
      })
    }

    const cart = getCart(auth.user.id)
    cart.promoCode = code
    touchCart(cart)
    commit()
    return HttpResponse.json(toCart(auth.user.id))
  }),

  http.delete(`${API}/cart/promo`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const cart = getCart(auth.user.id)
    cart.promoCode = null
    touchCart(cart)
    commit()
    return HttpResponse.json(toCart(auth.user.id))
  }),
]
