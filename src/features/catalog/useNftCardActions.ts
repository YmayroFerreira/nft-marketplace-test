import { useAddToCart, useFavorites, useToggleFavorite } from '../account/hooks'
import { useAuth } from '../auth/auth-context'
import type { Nft } from '@/types/catalog'

/**
 * Props for the NftCard actions (add to cart, favorite). Both need a session:
 * without one the auth dialog opens and the action runs after sign-in.
 */
export function useNftCardActions() {
  const { requireAuth } = useAuth()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const favoriteIds = new Set<string>(favorites.data?.nftIds ?? [])

  return {
    favoriteIds,
    isFavorite: (nftId: string) => favoriteIds.has(nftId),
    onAddToCart: (nft: Nft) => requireAuth(() => void addToCart.add(nft.id, nft.name).catch(() => {})),
    onToggleFavorite: (nft: Nft) =>
      requireAuth(() => toggleFavorite.mutate({ nftId: nft.id, favorite: !favoriteIds.has(nft.id) })),
  }
}
