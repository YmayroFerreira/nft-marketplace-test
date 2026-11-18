import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFavorites, useToggleFavorite } from '../account/hooks'
import { useCartActions } from '../cart/useCart'
import { useAuth } from '../auth/auth-context'
import type { Nft } from '@/types/catalog'

/**
 * Props for the NftCard actions. Favoriting needs a session (without one the
 * auth dialog opens and the action runs after sign-in); adding to the cart does not.
 */
export function useNftCardActions() {
  const { requireAuth } = useAuth()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const cart = useCartActions()
  const favoriteIds = useMemo(() => new Set<string>(favorites.data?.nftIds ?? []), [favorites.data?.nftIds])

  // The handlers keep the same identity, so memoized cards do not re-render when other data changes
  const latest = useRef({ requireAuth, toggle: toggleFavorite.mutate, addToCart: cart.add, favoriteIds })
  useEffect(() => {
    latest.current = { requireAuth, toggle: toggleFavorite.mutate, addToCart: cart.add, favoriteIds }
  })

  // Visitors can add to the cart too; it is merged into the account on sign-in
  const onAddToCart = useCallback((nft: Nft) => {
    void latest.current.addToCart(nft.id, nft.defaultEditionId, nft.name).catch(() => {})
  }, [])

  const onToggleFavorite = useCallback((nft: Nft) => {
    const { requireAuth, toggle, favoriteIds } = latest.current
    requireAuth(() => toggle({ nftId: nft.id, favorite: !favoriteIds.has(nft.id) }))
  }, [])

  return {
    favoriteIds,
    isFavorite: (nftId: string) => favoriteIds.has(nftId),
    onAddToCart,
    onToggleFavorite,
  }
}
