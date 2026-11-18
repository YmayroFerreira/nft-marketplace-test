import { http, HttpResponse } from 'msw'
import type { Cart, CartItem, GuestCartRequest, MergeCartResponse, UpdateCartItemRequest } from '@/types/account'
import type { EditionId, NftDetail } from '@/types/catalog'
import { addEth, minEth, mulEth, scaleEth, subEth, type EthString } from '@/lib/eth'
import { commit, getCart, getDb, touchCart } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'

export const NETWORK_FEE: EthString = '0.016'

/** Fictitious promo codes, documented in the README */
const PROMO_CODES: Record<string, { discount: (subtotal: EthString) => EthString; expiresAt?: string }> = {
  KURIO10: { discount: (subtotal) => scaleEth(subtotal, 10, 100, 18) },
  GENESIS: { discount: () => '0.05' },
  /** Already expired, to show the "expired coupon" error */
  LANCAMENTO2025: { discount: (subtotal) => scaleEth(subtotal, 20, 100, 18), expiresAt: '2025-12-31T23:59:59Z' },
}

export function findEdition(nft: NftDetail | undefined, editionId: string) {
  return nft?.editions.find((edition) => edition.id === editionId)
}

type Line = { nftId: string; editionId: EditionId; quantity: number }

/** Returns an API error for an unknown or expired code, or null if the code is usable */
function promoError(code: string) {
  const promo = PROMO_CODES[code]
  if (!promo) {
    return apiError(422, 'invalid_promo_code', 'Código promocional inválido.', { code: 'Código promocional inválido.' })
  }
  if (promo.expiresAt && Date.parse(promo.expiresAt) < Date.now()) {
    return apiError(422, 'expired_promo_code', 'Este código promocional expirou.', {
      code: 'Este código promocional expirou.',
    })
  }
  return null
}

/**
 * Prices cart lines with the current catalog data. Single source of the cart
 * math, used by the user cart, the visitor preview and the checkout quote.
 */
export function priceLines(lines: Line[], promoCode: string | null) {
  const nfts = getDb().nfts
  const items: CartItem[] = lines.flatMap((item) => {
    const nft = nfts[item.nftId]
    const edition = findEdition(nft, item.editionId)
    if (!nft || !edition) return []
    return [
      {
        nftId: nft.id,
        editionId: edition.id,
        editionLabel: edition.label,
        name: nft.name,
        imageUrl: nft.imageUrl,
        tokenId: nft.tokenId,
        unitPrice: edition.price,
        quantity: item.quantity,
        lineTotal: mulEth(edition.price, item.quantity),
        available: edition.available,
      },
    ]
  })
  const subtotal = addEth('0', ...items.map((item) => item.lineTotal))
  const promo = promoCode ? PROMO_CODES[promoCode] : undefined
  const discount = promo ? minEth(subtotal, promo.discount(subtotal)) : '0'
  const networkFee = items.length ? NETWORK_FEE : '0'
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    promoCode,
    subtotal,
    discount,
    networkFee,
    total: addEth(subEth(subtotal, discount), networkFee),
  }
}

/** Builds the public cart of a user, recomputing prices from the current NFT data */
export function toCart(userId: string): Cart {
  const stored = getCart(userId)
  return { ...priceLines(stored.items, stored.promoCode), version: stored.version, updatedAt: stored.updatedAt }
}

/** Validates and normalizes visitor cart lines sent by the browser */
function readGuestLines(body: Partial<GuestCartRequest> | null): Line[] | null {
  if (!Array.isArray(body?.items)) return null
  const lines: Line[] = []
  for (const item of body.items) {
    if (!item || typeof item.nftId !== 'string' || typeof item.editionId !== 'string') return null
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return null
    lines.push({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity })
  }
  return lines
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

/**
 * Sets the quantity of one edition in a user's cart. Shared by the endpoint
 * and by the guest cart merge on sign-in. Returns an error message or null.
 */
export function setCartItem(userId: string, nftId: string, editionId: EditionId, quantity: number): string | null {
  const nft = getDb().nfts[nftId]
  const edition = findEdition(nft, editionId)
  if (!nft || !edition) return 'NFT ou edição não encontrada.'
  if (quantity > edition.available) {
    return edition.available === 0
      ? `A edição ${edition.label} de ${nft.name} está indisponível.`
      : `Só restam ${edition.available} cópias da edição ${edition.label} de ${nft.name}.`
  }

  const cart = getCart(userId)
  const existing = cart.items.find((item) => item.nftId === nftId && item.editionId === editionId)
  if (quantity === 0) cart.items = cart.items.filter((item) => item !== existing)
  else if (existing) existing.quantity = quantity
  else cart.items.push({ nftId, editionId, quantity })
  touchCart(cart)
  return null
}

export const cartHandlers = [
  /**
   * Visitor cart: the browser keeps the lines; the API computes the values,
   * so prices, stock and coupon rules are the same as for signed-in users.
   */
  http.post(`${API}/cart/preview`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const body = await readJson<GuestCartRequest>(request)
    const lines = readGuestLines(body)
    if (!lines) return apiError(422, 'validation_error', 'Itens do carrinho inválidos.')

    const promoCode = body?.promoCode?.trim().toUpperCase() || null
    if (promoCode) {
      const invalid = promoError(promoCode)
      if (invalid) return invalid
    }
    const cart: Cart = { ...priceLines(lines, promoCode), version: 0, updatedAt: new Date().toISOString() }
    return HttpResponse.json(cart)
  }),

  /** Merges the visitor cart into the signed-in user's cart (called right after sign-in) */
  http.post(`${API}/cart/merge`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const body = await readJson<GuestCartRequest>(request)
    const lines = readGuestLines(body)
    if (!lines) return apiError(422, 'validation_error', 'Itens do carrinho inválidos.')

    const adjustments: string[] = []
    for (const line of lines) {
      const nft = getDb().nfts[line.nftId]
      const edition = findEdition(nft, line.editionId)
      if (!nft || !edition) continue
      const existing = getCart(auth.user.id).items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
      const wanted = (existing?.quantity ?? 0) + line.quantity
      const quantity = Math.min(wanted, edition.available)
      if (quantity < wanted) {
        adjustments.push(
          edition.available === 0
            ? `${nft.name} (${edition.label}) esgotou e não foi adicionado.`
            : `${nft.name} (${edition.label}) foi limitado a ${edition.available} cópias.`,
        )
      }
      if (quantity > 0) setCartItem(auth.user.id, line.nftId, line.editionId, quantity)
    }

    const promoCode = body?.promoCode?.trim().toUpperCase()
    if (promoCode && !promoError(promoCode)) {
      const cart = getCart(auth.user.id)
      cart.promoCode = promoCode
      touchCart(cart)
    }
    commit()
    const response: MergeCartResponse = { cart: toCart(auth.user.id), adjustments }
    return HttpResponse.json(response)
  }),

  http.get(`${API}/cart`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    return HttpResponse.json(toCart(auth.user.id))
  }),

  /** Sets the quantity of an NFT edition in the cart (adds it if missing; 0 removes it) */
  http.put(`${API}/cart/items/:nftId/:editionId`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const nftId = String(params.nftId)
    const editionId = String(params.editionId) as EditionId
    if (!findEdition(getDb().nfts[nftId], editionId)) {
      return apiError(404, 'not_found', 'NFT ou edição não encontrada.')
    }

    const body = await readJson<UpdateCartItemRequest>(request)
    const quantity = Number(body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) {
      return apiError(422, 'validation_error', 'A quantidade precisa ser um número inteiro.', {
        quantity: 'Quantidade inválida.',
      })
    }

    if (body?.expectedVersion !== undefined && body.expectedVersion !== getCart(auth.user.id).version) {
      return versionConflict(auth.user.id)
    }

    const error = setCartItem(auth.user.id, nftId, editionId, quantity)
    if (error) return apiError(409, 'insufficient_editions', error, { quantity: error })
    commit()
    return HttpResponse.json(toCart(auth.user.id))
  }),

  http.delete(`${API}/cart/items/:nftId/:editionId`, async ({ request, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const cart = getCart(auth.user.id)
    cart.items = cart.items.filter(
      (item) => !(item.nftId === String(params.nftId) && item.editionId === String(params.editionId)),
    )
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
    const invalid = promoError(code)
    if (invalid) return invalid

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
