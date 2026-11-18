import { NFT_DETAIL_IMAGE_SIZES, preloadImage, responsiveImage, smallImage } from '@/lib/images'
import { usePageMeta } from '@/lib/usePageMeta'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useFavorites, useToggleFavorite } from '@/features/account/hooks'
import { useCartActions } from '@/features/cart/useCart'
import { useAuth } from '@/features/auth/auth-context'
import { catalogQueries } from '@/features/catalog/queries'
import { useNftCardActions } from '@/features/catalog/useNftCardActions'
import { cn } from '@/lib/utils'
import { formatDate, formatEth } from '@/lib/format'
import heartIcon from '@/assets/icons/heart.svg'
import zoomIcon from '@/assets/icons/zoom.svg'
import cartIcon from '@/assets/icons/cart-small.svg'
import { BackButton } from '@/components/layout/MobilePageHeader'
import type { EditionId, NftDetail } from '@/types/catalog'

export const Route = createFileRoute('/nft/$nftId')({
  // Starts the request while the page code loads, and the artwork as soon as the data
  // arrives. Nothing here blocks the page, which is also what shows any error.
  loader: ({ context: { queryClient }, params }) => {
    const query = catalogQueries.detail(params.nftId)
    void queryClient.prefetchQuery({ ...query, retry: queryClient.getDefaultOptions().queries?.retry }).then(() => {
      const nft = queryClient.getQueryData(query.queryKey)
      if (nft) preloadImage(responsiveImage(nft.gallery[0] ?? nft.imageUrl, NFT_DETAIL_IMAGE_SIZES))
    })
  },
  component: NftDetailsPage,
})

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(catalogQueries.detail(nftId))
  usePageMeta(nft.data?.name ?? 'NFT', nft.data?.summary ?? 'Detalhes, edições e preço deste NFT na Kurio.')

  return (
    // Mobile: bottom padding keeps the content clear of the fixed buy bar
    <div className="container-page mt-4 flex flex-col gap-6 pb-48 md:mt-8 md:pb-0">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }, { label: nft.data?.name ?? 'NFT' }]} />
      </div>

      {nft.isPending ? (
        <DetailsSkeleton />
      ) : nft.isError ? (
        <ErrorState
          message={
            nft.error instanceof ApiError && nft.error.status === 404
              ? 'Este NFT não existe ou foi removido.'
              : nft.error.message
          }
          onRetry={nft.error instanceof ApiError && nft.error.status === 404 ? undefined : () => void nft.refetch()}
        />
      ) : (
        <>
          <Overview nft={nft.data} />
          <DetailsTabs nft={nft.data} />
          <RelatedNfts nftId={nft.data.id} />
        </>
      )}
    </div>
  )
}

function Overview({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  const { requireAuth } = useAuth()
  const [imageIndex, setImageIndex] = useState(0)
  // Default edition, or the first one with stock if it sold out
  const [editionId, setEditionId] = useState<EditionId>(
    () =>
      (nft.editions.find((e) => e.id === nft.defaultEditionId && e.available > 0) ??
        nft.editions.find((e) => e.available > 0) ??
        nft.editions[0]
      ).id,
  )
  const [quantity, setQuantity] = useState(1)
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const cartActions = useCartActions()
  const [isAdding, setIsAdding] = useState(false)
  const isFavorite = favorites.data?.nftIds.includes(nft.id) ?? false
  // Live data: the selected edition always comes from the (realtime-updated) NFT
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  const soldOut = edition.available === 0
  // A stock drop (realtime event) may leave the chosen quantity above the limit
  const safeQuantity = Math.min(quantity, Math.max(1, edition.available))
  const image = nft.gallery[imageIndex] ?? nft.imageUrl

  // Buying does not need a session: visitors keep a cart that is merged on sign-in
  async function buy(goToCart = true) {
    setIsAdding(true)
    try {
      await cartActions.add(nft.id, edition.id, nft.name, safeQuantity)
      if (goToCart) void navigate({ to: '/carrinho' })
    } catch {
      // The error toast is shown by the cart actions
    } finally {
      setIsAdding(false)
    }
  }

  const toggleFavoriteAction = () =>
    requireAuth(() => toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite }))

  return (
    <section aria-labelledby="nft-title" className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
      {/* Gallery */}
      <div className="flex flex-col gap-3 md:flex-row">
        {/* Mobile frame: back and favorite buttons above the artwork */}
        <div className="flex items-center justify-between md:hidden">
          <BackButton fallback="/" />
          <button
            type="button"
            onClick={toggleFavoriteAction}
            aria-label={isFavorite ? 'Favoritado' : 'Favoritar'}
            aria-pressed={isFavorite}
            className={cn('grid size-[35px] place-items-center rounded-full bg-surface-dark', isFavorite && 'ring-2 ring-primary')}
          >
            <img src={heartIcon} alt="" width={18} height={18} />
          </button>
        </div>
        <ul className="hidden gap-3 md:flex md:flex-col" aria-label="Imagens">
          {nft.gallery.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setImageIndex(index)}
                aria-label={`Ver imagem ${index + 1}`}
                aria-pressed={index === imageIndex}
                className={cn(
                  'block overflow-hidden rounded-md border-2 bg-surface-card p-1',
                  index === imageIndex ? 'border-primary' : 'border-transparent',
                )}
              >
                <img src={smallImage(src)} alt="" width={72} height={72} loading="lazy" className="size-16 rounded object-cover sm:size-[72px]" />
              </button>
            </li>
          ))}
        </ul>
        <div className="relative flex-1 md:bg-surface-card md:p-4">
          <img
            {...responsiveImage(image, NFT_DETAIL_IMAGE_SIZES)}
            alt={nft.name}
            width={560}
            height={560}
            fetchPriority="high"
            className="aspect-square w-full rounded-3xl object-cover md:rounded-[22px]"
          />
          <a
            href={image}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir imagem em tamanho original"
            className="absolute top-5 right-5 hidden size-9 place-items-center rounded-full bg-ink/60 md:grid"
          >
            <img src={zoomIcon} alt="" width={18} height={18} />
          </a>
        </div>
      </div>

      {/* Info. Mobile frame: a rounded sheet that overlaps the bottom of the artwork */}
      <div className="flex flex-col gap-5 max-md:relative max-md:-mx-4 max-md:-mt-16 max-md:rounded-t-[32px] max-md:bg-surface-card max-md:px-6 max-md:pt-8 max-md:pb-6">
        <div className="flex flex-col gap-3 md:border-b md:border-border md:pb-4">
          <div className="flex items-center justify-between gap-3">
            <h1 id="nft-title" className="text-2xl font-bold text-foreground">
              {nft.name}
            </h1>
            <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2.5 py-1 text-sm text-foreground md:hidden">
              <span aria-hidden className="text-text-accent">
                ★
              </span>
              <span className="sr-only">Nota </span>
              {nft.rating.average}
              <span aria-hidden>({nft.rating.count})</span>
              <span className="sr-only"> de 5, {nft.rating.count} avaliações</span>
            </p>
          </div>
          <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
            <p className="flex items-center gap-3 text-xl font-bold text-text-accent" aria-live="polite">
              {formatEth(edition.price)}
              {edition.id === nft.defaultEditionId && nft.previousPrice !== undefined && (
                <span className="text-base font-normal text-brand-secondary line-through">
                  <span className="sr-only">Preço anterior: </span>
                  {formatEth(nft.previousPrice)}
                </span>
              )}
            </p>
            <p className="flex items-center gap-2 text-sm text-foreground">
              <span aria-hidden className="tracking-widest text-text-accent">
                ★★★★★
              </span>
              <span>
                <span className="sr-only">Nota {nft.rating.average} de 5, </span>
                {nft.rating.count} avaliações de colecionadores
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-foreground max-md:sr-only">Sobre este NFT:</h2>
          <p className="text-sm leading-6 text-text-secondary md:text-text-accent">{nft.summary}</p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold text-foreground">Edição:</legend>
          <div className="flex flex-wrap gap-2">
            {nft.editions.map((option) => {
              const unavailable = option.available === 0
              return (
                <label
                  key={option.id}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs has-focus-visible:outline-2 has-focus-visible:outline-ring',
                    option.id === editionId ? 'border-primary' : 'border-transparent',
                    unavailable
                      ? 'cursor-not-allowed text-text-secondary/60 line-through'
                      : 'cursor-pointer text-foreground hover:border-border-soft',
                  )}
                >
                  <input
                    type="radio"
                    name="edition"
                    value={option.id}
                    checked={option.id === editionId}
                    disabled={unavailable}
                    onChange={() => {
                      setEditionId(option.id)
                      setQuantity(1)
                    }}
                    className="sr-only"
                  />
                  {option.label}
                  {unavailable && <span className="sr-only"> (indisponível)</span>}
                </label>
              )
            })}
          </div>
          <p className="text-xs text-text-secondary" aria-live="polite">
            {soldOut
              ? `A edição ${edition.label} está indisponível.`
              : `${edition.available} de ${edition.total} disponíveis na edição ${edition.label}`}
          </p>
        </fieldset>

        <div className="hidden flex-wrap items-center gap-4 md:flex">
          <QuantityStepper
            label={`Quantidade de ${nft.name}`}
            value={safeQuantity}
            max={Math.max(1, edition.available)}
            onChange={setQuantity}
            disabled={soldOut}
          />
          <div className="flex flex-1 flex-wrap gap-2">
            <Button size="brand-md" className="min-w-[124px] font-bold uppercase" onClick={() => void buy()} disabled={soldOut || isAdding}>
              {isAdding ? 'Adicionando…' : 'Comprar'}
            </Button>
            <Button
              size="brand-md"
              variant="outline"
              aria-pressed={isFavorite}
              onClick={toggleFavoriteAction}
              className={cn('border-primary bg-transparent text-foreground', isFavorite && 'bg-primary/20')}
            >
              <img src={heartIcon} alt="" width={16} height={16} />
              {isFavorite ? 'Favoritado' : 'Favoritar'}
            </Button>
          </div>
        </div>

        <dl className="flex flex-col gap-2 text-sm text-text-secondary">
          <div className="flex gap-1">
            <dt>ID do token:</dt>
            <dd>{nft.tokenId}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Coleção:</dt>
            <dd>{nft.collectionName}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Atributos:</dt>
            <dd>{nft.attributes.map((a) => a.value).join(', ')}</dd>
          </div>
        </dl>

        {/* Mobile frame: fixed buy bar (quantity, price, buy, add to cart) */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-[32px] border-t border-border bg-surface-card px-6 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-foreground" aria-hidden>
                Qtd.
              </span>
              <QuantityStepper
                size="sm"
                label={`Quantidade de ${nft.name}`}
                value={safeQuantity}
                max={Math.max(1, edition.available)}
                onChange={setQuantity}
                disabled={soldOut}
              />
            </div>
            <p className="text-2xl font-bold text-text-accent">{formatEth(edition.price)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="gradient" size="pill" className="flex-1" onClick={() => void buy()} disabled={soldOut || isAdding}>
              {isAdding ? 'Adicionando…' : soldOut ? 'Indisponível' : 'Comprar NFT'}
            </Button>
            <button
              type="button"
              onClick={() => void buy(false)}
              disabled={soldOut || isAdding}
              aria-label={`Adicionar ${nft.name} ao carrinho`}
              className="grid size-[60px] shrink-0 place-items-center rounded-full bg-surface-dark disabled:opacity-40"
            >
              <img src={cartIcon} alt="" width={20} height={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

type Tab = 'details' | 'reviews'

function DetailsTabs({ nft }: { nft: NftDetail }) {
  const [tab, setTab] = useState<Tab>('details')
  const [reviewsPage, setReviewsPage] = useState(1)
  const reviews = useQuery({ ...catalogQueries.reviews(nft.id, reviewsPage), enabled: tab === 'reviews' })
  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Detalhes do NFT' },
    { id: 'reviews', label: `Avaliações de colecionadores (${nft.rating.count})` },
  ]

  return (
    <section className="mt-8 flex flex-col gap-4">
      <div role="tablist" aria-label="Informações do NFT" className="flex gap-6 overflow-x-auto border-b border-border">
        {tabs.map((t, index) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`nft-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`nft-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const next = tabs[(index + 1) % tabs.length]
                setTab(next.id)
                document.getElementById(`nft-tab-${next.id}`)?.focus()
              }
            }}
            className={cn(
              '-mb-px shrink-0 border-b-2 pb-2 text-base whitespace-nowrap',
              tab === t.id ? 'border-text-accent text-text-accent' : 'border-transparent text-foreground hover:text-text-accent',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`nft-panel-${tab}`} role="tabpanel" aria-labelledby={`nft-tab-${tab}`} className="text-sm leading-6">
        {tab === 'details' ? (
          <div className="flex flex-col gap-4 text-text-secondary">
            {nft.description.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
            <div>
              <h3 className="font-bold text-foreground">Rede:</h3>
              <p className="text-text-accent">
                Cunhado na {nft.network === 'ethereum' ? 'Ethereum' : nft.network === 'polygon' ? 'Polygon' : 'Solana'} com
                procedência imutável e metadados armazenados no {nft.contract.storage}.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Contrato:</h3>
              <p className="text-text-accent">
                Direitos autorais do criador: {nft.contract.royaltyPercent}% nas vendas secundárias, pagos automaticamente
                pelos mercados compatíveis.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Direitos autorais:</h3>
              <p className="text-text-accent">
                {nft.contract.address} • Contrato inteligente {nft.contract.standard} verificado.
              </p>
            </div>
          </div>
        ) : reviews.isPending ? (
          <div className="skeleton-shimmer h-40 rounded" aria-busy />
        ) : reviews.isError ? (
          <ErrorState message={reviews.error.message} onRetry={() => void reviews.refetch()} />
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {reviews.data.items.map((review) => (
                <li key={review.id} className="rounded-md bg-surface-card p-4">
                  <p className="flex flex-wrap items-center gap-2 text-foreground">
                    <strong>{review.author}</strong>
                    <span aria-label={`Nota ${review.rating} de 5`} className="text-text-accent">
                      {'★'.repeat(review.rating)}
                    </span>
                    <time dateTime={review.createdAt} className="text-xs text-text-secondary">
                      {formatDate(review.createdAt)}
                    </time>
                  </p>
                  <p className="text-text-secondary">{review.comment}</p>
                </li>
              ))}
            </ul>
            <Pagination page={reviewsPage} totalPages={reviews.data.totalPages} onPageChange={setReviewsPage} className="self-end" />
          </div>
        )}
      </div>
    </section>
  )
}

function RelatedNfts({ nftId }: { nftId: string }) {
  const related = useQuery(catalogQueries.related(nftId))
  const actions = useNftCardActions()
  if (related.isError || related.data?.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="mt-10 flex flex-col gap-6">
      <h2 id="related-title" className="border-b border-border pb-2 text-lg font-bold text-text-accent">
        Mais desta coleção
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {related.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))
          : related.data.map((nft) => (
              <li key={nft.id}>
                <NftCard
                  nft={nft}
                  isFavorite={actions.isFavorite(nft.id)}
                  onAddToCart={actions.onAddToCart}
                  onToggleFavorite={actions.onToggleFavorite}
                />
              </li>
            ))}
      </ul>
    </section>
  )
}

function DetailsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-busy>
      <div className="skeleton-shimmer aspect-square rounded-lg" />
      <div className="flex flex-col gap-4">
        <div className="skeleton-shimmer h-8 w-2/3 rounded" />
        <div className="skeleton-shimmer h-6 w-1/3 rounded" />
        <div className="skeleton-shimmer h-24 rounded" />
        <div className="skeleton-shimmer h-10 w-1/2 rounded" />
      </div>
    </div>
  )
}
