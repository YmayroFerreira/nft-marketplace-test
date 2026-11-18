import { http, HttpResponse } from 'msw'
import type { Cart, UpdateCartItemRequest } from '@/types/account'
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

/** Builds the public cart, recomputing prices from the current NFT data */
export function toCart(userId: string): Cart {
  const stored = getCart(userId)
  const nfts = getDb().nfts
  const items = stored.items.flatMap((item) => {
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
  const promo = stored.promoCode ? PROMO_CODES[stored.promoCode] : undefined
  const discount = promo ? minEth(subtotal, promo.discount(subtotal)) : '0'
  const networkFee = items.length ? NETWORK_FEE : '0'

  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    promoCode: stored.promoCode,
    subtotal,
    discount,
    networkFee,
    total: addEth(subEth(subtotal, discount), networkFee),
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
    const promo = PROMO_CODES[code]
    if (!promo) {
      return apiError(422, 'invalid_promo_code', 'Código promocional inválido.', {
        code: 'Código promocional inválido.',
      })
    }
    if (promo.expiresAt && Date.parse(promo.expiresAt) < Date.now()) {
      return apiError(422, 'expired_promo_code', 'Este código promocional expirou.', {
        code: 'Este código promocional expirou.',
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
