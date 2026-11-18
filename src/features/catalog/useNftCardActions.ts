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
  const favoriteIds = new Set<string>(favorites.data?.nftIds ?? [])

  return {
    favoriteIds,
    isFavorite: (nftId: string) => favoriteIds.has(nftId),
    // Visitors can add to the cart too; it is merged into the account on sign-in
    onAddToCart: (nft: Nft) => void cart.add(nft.id, nft.defaultEditionId, nft.name).catch(() => {}),
    onToggleFavorite: (nft: Nft) =>
      requireAuth(() => toggleFavorite.mutate({ nftId: nft.id, favorite: !favoriteIds.has(nft.id) })),
  }
}
