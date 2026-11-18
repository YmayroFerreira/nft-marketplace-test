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
import { useAddToCart, useFavorites, useToggleFavorite } from '@/features/account/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { catalogQueries } from '@/features/catalog/queries'
import { useNftCardActions } from '@/features/catalog/useNftCardActions'
import { cn } from '@/lib/utils'
import { formatDate, formatEth } from '@/lib/format'
import heartIcon from '@/assets/icons/heart.svg'
import zoomIcon from '@/assets/icons/zoom.svg'
import type { EditionId, NftDetail } from '@/types/catalog'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailsPage,
})

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(catalogQueries.detail(nftId))

  return (
    <div className="container-page mt-6 flex flex-col gap-6 md:mt-8">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }, { label: nft.data?.name ?? 'NFT' }]} />

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
  const addToCart = useAddToCart()
  const isFavorite = favorites.data?.nftIds.includes(nft.id) ?? false
  // Live data: the selected edition always comes from the (realtime-updated) NFT
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  const soldOut = edition.available === 0
  // A stock drop (realtime event) may leave the chosen quantity above the limit
  const safeQuantity = Math.min(quantity, Math.max(1, edition.available))
  const image = nft.gallery[imageIndex] ?? nft.imageUrl

  function buy() {
    requireAuth(async () => {
      try {
        await addToCart.add(nft.id, edition.id, nft.name, safeQuantity)
        void navigate({ to: '/carrinho' })
      } catch {
        // The error toast is shown by the mutation
      }
    })
  }

  return (
    <section aria-labelledby="nft-title" className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
      {/* Gallery */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <ul className="flex gap-3 sm:flex-col" aria-label="Imagens">
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
                <img src={src} alt="" width={72} height={72} loading="lazy" className="size-16 rounded object-cover sm:size-[72px]" />
              </button>
            </li>
          ))}
        </ul>
        <div className="relative flex-1 bg-surface-card p-3 sm:p-4">
          <img
            src={image}
            alt={nft.name}
            width={560}
            height={560}
            fetchPriority="high"
            className="aspect-square w-full rounded-[22px] object-cover"
          />
          <a
            href={image}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir imagem em tamanho original"
            className="absolute top-5 right-5 grid size-9 place-items-center rounded-full bg-ink/60"
          >
            <img src={zoomIcon} alt="" width={18} height={18} />
          </a>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4">
          <h1 id="nft-title" className="text-2xl font-bold text-foreground">
            {nft.name}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-3">
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
          <h2 className="text-sm font-bold text-foreground">Sobre este NFT:</h2>
          <p className="text-sm leading-6 text-text-accent">{nft.summary}</p>
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

        <div className="flex flex-wrap items-center gap-4">
          <QuantityStepper
            label={`Quantidade de ${nft.name}`}
            value={safeQuantity}
            max={Math.max(1, edition.available)}
            onChange={setQuantity}
            disabled={soldOut}
          />
          <div className="flex flex-1 flex-wrap gap-2">
            <Button size="brand-md" className="min-w-[124px] font-bold uppercase" onClick={buy} disabled={soldOut || addToCart.isPending}>
              {addToCart.isPending ? 'Adicionando…' : 'Comprar'}
            </Button>
            <Button
              size="brand-md"
              variant="outline"
              aria-pressed={isFavorite}
              onClick={() => requireAuth(() => toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite }))}
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
