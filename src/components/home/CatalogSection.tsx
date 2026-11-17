import { Pagination } from '@/components/common/Pagination'
import { NftCard, NftCardSkeleton } from '@/components/nft/NftCard'
import { CatalogToolbar } from './CatalogToolbar'
import { FeaturedNftBanner } from './FeaturedNftBanner'
import { FiltersSidebar, type CatalogFilters } from './FiltersSidebar'
import type { CatalogFacets, CatalogSort, CatalogTab, Nft } from '@/types/catalog'

const SKELETON_COUNT = 9

interface CatalogSectionProps {
  id: string
  nfts: Nft[]
  isLoading?: boolean
  featuredNft: Nft
  facets: CatalogFacets
  filters: CatalogFilters
  tab: CatalogTab
  sort: CatalogSort
  page: number
  totalPages: number
  onFiltersChange: (filters: CatalogFilters) => void
  onTabChange: (tab: CatalogTab) => void
  onSortChange: (sort: CatalogSort) => void
  onPageChange: (page: number) => void
}

export function CatalogSection({
  id,
  nfts,
  isLoading = false,
  featuredNft,
  facets,
  filters,
  tab,
  sort,
  page,
  totalPages,
  onFiltersChange,
  onTabChange,
  onSortChange,
  onPageChange,
}: CatalogSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="container-page mt-24 flex scroll-mt-6 gap-12"
    >
      <h2 id={`${id}-title`} className="sr-only">
        Catálogo de NFTs
      </h2>

      {/* Below lg the sidebar is hidden; mobile filters will open in a drawer */}
      <aside className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
        <FiltersSidebar facets={facets} value={filters} onChange={onFiltersChange} />
        <FeaturedNftBanner nft={featuredNft} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col items-end gap-[88px]">
        <div className="flex w-full flex-col gap-8">
          <CatalogToolbar
            tab={tab}
            sort={sort}
            onTabChange={onTabChange}
            onSortChange={onSortChange}
          />

          <ul
            aria-busy={isLoading}
            className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 md:gap-x-[34px] md:gap-y-14"
          >
            {isLoading
              ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <li key={i}>
                    <NftCardSkeleton />
                  </li>
                ))
              : nfts.map((nft) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} />
                  </li>
                ))}
          </ul>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </section>
  )
}
