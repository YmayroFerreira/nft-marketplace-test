import { useSyncExternalStore } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { cartApi } from '@/api/endpoints'
import type { Cart } from '@/types/account'
import type { EditionId } from '@/types/catalog'
import { accountKeys } from '../account/keys'
import { useAuth } from '../auth/auth-context'
import { guestCart, type GuestCart } from './guest-cart'

/**
 * One cart API for the whole app:
 * - signed in: the cart lives on the server (GET/PUT /cart...)
 * - visitor: lines live in the browser and values come from POST /cart/preview
 * Screens use useCart() / useCartActions() and never need to know which.
 */

const EMPTY_CART: Cart = {
  items: [],
  itemCount: 0,
  promoCode: null,
  subtotal: '0',
  discount: '0',
  networkFee: '0',
  total: '0',
  version: 0,
  updatedAt: new Date(0).toISOString(),
}

export const guestCartKey = (cart: GuestCart) => ['guest-cart', cart] as const

export function useGuestCart() {
  return useSyncExternalStore(guestCart.subscribe, guestCart.get)
}

async function previewGuestCart(cart: GuestCart): Promise<Cart> {
  if (cart.items.length === 0) return EMPTY_CART
  try {
    return await cartApi.preview(cart)
  } catch (error) {
    // A stored coupon that is no longer valid (e.g. expired) is dropped
    if (error instanceof ApiError && cart.promoCode && error.code.endsWith('promo_code')) {
      guestCart.setPromo(null)
      toast.error(error.message)
      return cartApi.preview({ items: cart.items })
    }
    throw error
  }
}

export function useCart() {
  const { user, isLoadingSession } = useAuth()
  const guest = useGuestCart()

  const userCart = useQuery({
    queryKey: accountKeys.cart(user?.id ?? 'anonymous'),
    queryFn: cartApi.get,
    enabled: user !== null,
  })
  const visitorCart = useQuery({
    queryKey: guestCartKey(guest),
    queryFn: () => previewGuestCart(guest),
    enabled: user === null && !isLoadingSession,
    // Keep the previous values on screen while a changed cart is recomputed
    placeholderData: keepPreviousData,
  })
  return user ? userCart : visitorCart
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Algo deu errado. Tente novamente.'
}

interface SetItemInput {
  nftId: string
  editionId: EditionId
  quantity: number
  /** Signed-in cart only: cart version the user saw, to detect changes from another tab */
  expectedVersion?: number
}

export function useCartActions() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = accountKeys.cart(user?.id ?? 'anonymous')

  function onServerCart(cart: Cart) {
    queryClient.setQueryData(userKey, cart)
  }

  function onError(error: Error) {
    // A version conflict comes with the current cart: show it instead of the stale one
    if (error instanceof ApiError && error.code === 'cart_conflict') {
      const body = error.body as { cart?: Cart } | undefined
      if (body?.cart) onServerCart(body.cart)
    }
    toast.error(errorMessage(error))
  }

  const setItem = useMutation({
    mutationFn: async ({ nftId, editionId, quantity, expectedVersion }: SetItemInput) => {
      if (user) return cartApi.setItem(nftId, editionId, { quantity, expectedVersion })
      guestCart.setItem(nftId, editionId, quantity)
      return null
    },
    onSuccess: (cart) => cart && onServerCart(cart),
    onError,
  })

  const removeItem = useMutation({
    mutationFn: async ({ nftId, editionId }: { nftId: string; editionId: EditionId }) => {
      if (user) return cartApi.removeItem(nftId, editionId)
      guestCart.setItem(nftId, editionId, 0)
      return null
    },
    onSuccess: (cart) => cart && onServerCart(cart),
    onError,
  })

  const applyPromo = useMutation({
    mutationFn: async (code: string) => {
      if (user) return cartApi.applyPromo(code)
      // Validate with the API before keeping the coupon in the visitor cart
      const current = guestCart.get()
      const cart = await cartApi.preview({ items: current.items, promoCode: code })
      guestCart.setPromo(code.trim().toUpperCase())
      return cart
    },
    onSuccess: (cart) => {
      if (user) onServerCart(cart)
      else queryClient.setQueryData(guestCartKey(guestCart.get()), cart)
    },
    onError: (error) => {
      // Field errors (invalid/expired coupon) are shown next to the field
      if (!(error instanceof ApiError && error.fields)) toast.error(errorMessage(error))
    },
  })

  const removePromo = useMutation({
    mutationFn: async () => {
      if (user) return cartApi.removePromo()
      guestCart.setPromo(null)
      return null
    },
    onSuccess: (cart) => cart && onServerCart(cart),
    onError,
  })

  /** Adds copies of an NFT edition on top of what is already in the cart */
  async function add(nftId: string, editionId: EditionId, name: string, quantity = 1) {
    if (user) {
      const cart = queryClient.getQueryData<Cart>(userKey) ?? (await cartApi.get())
      const current = cart.items.find((item) => item.nftId === nftId && item.editionId === editionId)?.quantity ?? 0
      await setItem.mutateAsync({ nftId, editionId, quantity: current + quantity })
    } else {
      const wanted = guestCart.quantityOf(nftId, editionId) + quantity
      // The visitor cart is checked against the API, which knows the stock
      const preview = await cartApi.preview({
        items: [...guestCart.get().items.filter((i) => !(i.nftId === nftId && i.editionId === editionId)), { nftId, editionId, quantity: wanted }],
      })
      const line = preview.items.find((item) => item.nftId === nftId && item.editionId === editionId)
      if (!line || line.available === 0) {
        toast.error(`A edição escolhida de ${name} está indisponível.`)
        throw new Error('unavailable')
      }
      if (wanted > line.available) {
        toast.error(`Só restam ${line.available} cópias dessa edição de ${name}.`)
        guestCart.setItem(nftId, editionId, line.available)
        return
      }
      guestCart.setItem(nftId, editionId, wanted)
    }
    toast.success(`${name} adicionado ao carrinho.`)
  }

  return { setItem, removeItem, applyPromo, removePromo, add, isGuest: user === null }
}
