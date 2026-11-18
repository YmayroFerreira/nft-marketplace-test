import { Pagination } from '@/components/common/Pagination'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CatalogToolbar } from './CatalogToolbar'
import { FeaturedNftBanner } from './FeaturedNftBanner'
import { FiltersSidebar, type CatalogFilters } from './FiltersSidebar'
import type { CatalogFacets, CatalogSort, CatalogTab, Nft } from '@/types/catalog'

const SKELETON_COUNT = 9

interface CatalogSectionProps {
  id: string
  nfts: Nft[]
  isLoading?: boolean
  /** Shown instead of the grid when the catalog request failed */
  errorMessage?: string
  onRetry?: () => void
  /** Missing while loading (or if the request failed) */
  featuredNft?: Nft
  facets?: CatalogFacets
  filters: CatalogFilters
  tab: CatalogTab
  sort: CatalogSort
  page: number
  totalPages: number
  onFiltersChange: (filters: CatalogFilters) => void
  onClearFilters: () => void
  /** Active free-text search, shown above the grid */
  query?: string
  onClearQuery?: () => void
  onTabChange: (tab: CatalogTab) => void
  onSortChange: (sort: CatalogSort) => void
  onPageChange: (page: number) => void
  favoriteIds?: ReadonlySet<string>
  onAddToCart?: (nft: Nft) => void
  onToggleFavorite?: (nft: Nft) => void
  /** Mobile filters drawer, opened from the mobile search bar */
  isFiltersDrawerOpen?: boolean
  onFiltersDrawerOpenChange?: (open: boolean) => void
}

export function CatalogSection({
  id,
  nfts,
  isLoading = false,
  errorMessage,
  onRetry,
  featuredNft,
  facets,
  filters,
  tab,
  sort,
  page,
  totalPages,
  onFiltersChange,
  onClearFilters,
  query,
  onClearQuery,
  onTabChange,
  onSortChange,
  onPageChange,
  favoriteIds,
  onAddToCart,
  onToggleFavorite,
  isFiltersDrawerOpen = false,
  onFiltersDrawerOpenChange,
}: CatalogSectionProps) {
  const isEmpty = !isLoading && !errorMessage && nfts.length === 0

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="container-page mt-4 flex scroll-mt-6 gap-12 md:mt-24"
    >
      <Sheet open={isFiltersDrawerOpen} onOpenChange={(open) => onFiltersDrawerOpenChange?.(open)}>
        <SheetContent
          side="left"
          className="w-[min(342px,90vw)] gap-0 overflow-y-auto border-border bg-surface-card p-0"
        >
          <SheetTitle className="px-5 pt-5 text-lg font-bold text-foreground">Filtros</SheetTitle>
          {facets ? (
            <FiltersSidebar
              // Re-mounts when the price in the URL changes (Back/Forward), resetting the slider draft
              key={`${filters.price?.min ?? ''}-${filters.price?.max ?? ''}`}
              facets={facets}
              value={filters}
              onChange={onFiltersChange}
            />
          ) : (
            <FiltersSkeleton />
          )}
        </SheetContent>
      </Sheet>

      <h2 id={`${id}-title`} className="sr-only">
        Catálogo de NFTs
      </h2>

      {/* Below lg the sidebar is hidden; filters open in the drawer above */}
      <aside className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
        {facets ? (
          <FiltersSidebar
              // Re-mounts when the price in the URL changes (Back/Forward), resetting the slider draft
              key={`${filters.price?.min ?? ''}-${filters.price?.max ?? ''}`}
              facets={facets}
              value={filters}
              onChange={onFiltersChange}
            />
        ) : (
          <FiltersSkeleton />
        )}
        {featuredNft ? (
          <FeaturedNftBanner nft={featuredNft} />
        ) : (
          <div aria-hidden className="skeleton-shimmer h-[470px]" />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col items-end gap-14 md:gap-[88px]">
        <div className="flex w-full flex-col gap-4 md:gap-8">
          {query && (
            <p className="flex flex-wrap items-center gap-3 text-sm text-foreground" aria-live="polite">
              <span>
                Resultados para <strong className="text-text-accent">“{query}”</strong>
              </span>
              <button type="button" onClick={onClearQuery} className="text-xs text-text-secondary underline hover:text-text-accent">
                Limpar busca
              </button>
            </p>
          )}
          <CatalogToolbar tab={tab} sort={sort} onTabChange={onTabChange} onSortChange={onSortChange} />

          {errorMessage ? (
            <div role="alert" className="flex flex-col items-center gap-4 bg-surface-card px-6 py-16 text-center">
              <p className="text-base text-foreground">{errorMessage}</p>
              {onRetry && (
                <Button size="brand-sm" onClick={onRetry}>
                  Tentar novamente
                </Button>
              )}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-4 bg-surface-card px-6 py-16 text-center">
              <p className="text-base text-foreground">Nenhum NFT encontrado com esses filtros.</p>
              <Button size="brand-sm" variant="outline" onClick={onClearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <ul
              aria-busy={isLoading}
              // Mobile: two staggered columns (the right one starts 32px lower), as in the Figma
              className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 max-md:[&>li:nth-child(even)]:translate-y-8 sm:gap-x-6 md:grid-cols-3 md:gap-x-[34px] md:gap-y-14 md:pb-0"
            >
              {isLoading
                ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                    <li key={i}>
                      <NftCardSkeleton />
                    </li>
                  ))
                : nfts.map((nft) => (
                    <li key={nft.id}>
                      <NftCard
                        nft={nft}
                        isFavorite={favoriteIds?.has(nft.id)}
                        onAddToCart={onAddToCart}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </li>
                  ))}
            </ul>
          )}
        </div>

        {!errorMessage && !isEmpty && (
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        )}
      </div>
    </section>
  )
}

function FiltersSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 bg-surface-card p-5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="skeleton-shimmer h-5 rounded" style={{ width: `${60 + ((i * 17) % 35)}%` }} />
      ))}
    </div>
  )
}
