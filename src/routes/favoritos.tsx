import { usePageMeta } from '@/lib/usePageMeta'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ErrorState } from '@/components/common/ErrorState'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { buttonVariants } from '@/components/ui/button'
import { useFavorites } from '@/features/account/hooks'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { useNftCardActions } from '@/features/catalog/useNftCardActions'

export const Route = createFileRoute('/favoritos')({
  component: FavoritesPage,
})

function FavoritesPage() {
  usePageMeta('Lista de interesse', 'Os NFTs que você favoritou na Kurio.')
  return (
    <div className="container-page mt-6 flex flex-col gap-6 md:mt-8">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Favoritos' }]} />
      <h1 className="text-2xl font-bold text-foreground">Lista de interesse</h1>
      <RequireAuth message="Entre para ver os NFTs que você favoritou.">
        <FavoritesContent />
      </RequireAuth>
    </div>
  )
}

function FavoritesContent() {
  const favorites = useFavorites()
  const actions = useNftCardActions()

  if (favorites.isError) {
    return <ErrorState message={favorites.error.message} onRetry={() => void favorites.refetch()} />
  }

  if (favorites.data?.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-16 text-center">
        <p className="text-lg text-foreground">Você ainda não favoritou nenhum NFT.</p>
        <Link to="/" className={buttonVariants({ size: 'brand-lg' })}>
          Explorar NFTs
        </Link>
      </div>
    )
  }

  return (
    <ul aria-busy={favorites.isPending} className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {favorites.isPending
        ? Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <NftCardSkeleton />
            </li>
          ))
        : favorites.data.items.map((nft) => (
            <li key={nft.id}>
              <NftCard
                nft={nft}
                isFavorite
                onAddToCart={actions.onAddToCart}
                onToggleFavorite={actions.onToggleFavorite}
              />
            </li>
          ))}
    </ul>
  )
}
