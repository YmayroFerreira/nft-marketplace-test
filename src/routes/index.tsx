import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MobileSearchBar } from '@/components/home/MobileSearchBar'
import { BlogSection } from '@/components/home/BlogSection'
import { CatalogSection } from '@/components/home/CatalogSection'
import type { CatalogFilters } from '@/components/home/FiltersSidebar'
import { Hero } from '@/components/home/Hero'
import { PromoSection } from '@/components/home/PromoSection'
import { useAuth } from '@/features/auth/auth-context'
import type { CatalogSort, CatalogTab, Network } from '@/types/catalog'
// TEMPORARY: static fixtures until the MSW handlers + TanStack Query hooks exist.
// Once they do, these imports are replaced by useQuery calls and the fixtures
// are only read by the mock handlers.
import { blogPosts, promos } from '@/mocks/fixtures/content'
import { catalogFacets, featuredNft, nfts } from '@/mocks/fixtures/nfts'

const TABS: CatalogTab[] = ['all', 'new', 'trending']
const SORTS: CatalogSort[] = ['recent', 'price-asc', 'price-desc']
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

/** Catalog state lives in the URL so it survives refresh and can be shared */
interface HomeSearch {
  page?: number
  tab?: CatalogTab
  sort?: CatalogSort
  collections?: string[]
  networks?: Network[]
  minPrice?: number
  maxPrice?: number
  /** Free-text search from the mobile search bar */
  q?: string
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = value.filter((v): v is string => typeof v === 'string')
  return strings.length ? strings : undefined
}

function asPositiveNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const page = asPositiveNumber(search.page)
    return {
      page: page && page > 1 ? Math.floor(page) : undefined,
      tab: TABS.includes(search.tab as CatalogTab) ? (search.tab as CatalogTab) : undefined,
      sort: SORTS.includes(search.sort as CatalogSort) ? (search.sort as CatalogSort) : undefined,
      collections: asStringArray(search.collections),
      networks: asStringArray(search.networks)?.filter((n): n is Network =>
        NETWORKS.includes(n as Network),
      ),
      minPrice: asPositiveNumber(search.minPrice),
      maxPrice: asPositiveNumber(search.maxPrice),
      q: typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined,
    }
  },
  component: HomePage,
})

const CATALOG_ID = 'catalogo'

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { requireAuth } = useAuth()
  const [isFiltersDrawerOpen, setFiltersDrawerOpen] = useState(false)

  const filters: CatalogFilters = {
    collections: search.collections ?? [],
    networks: search.networks ?? [],
    price:
      search.minPrice !== undefined && search.maxPrice !== undefined
        ? { min: search.minPrice, max: search.maxPrice }
        : undefined,
  }

  /** Updates the URL; any filter change goes back to page 1 */
  function updateSearch(next: Partial<HomeSearch>, keepPage = false) {
    void navigate({
      search: (prev) => ({ ...prev, ...next, page: keepPage ? next.page : undefined }),
      resetScroll: false,
      replace: true,
    })
  }

  return (
    <>
      <MobileSearchBar
        initialQuery={search.q}
        onSearch={(q) => updateSearch({ q: q || undefined })}
        onOpenFilters={() => setFiltersDrawerOpen(true)}
      />

      <Hero
        image={{
          src: '/nfts/emerald-ape.png',
          alt: 'Emerald Ape, macaco de óculos escuros e jaqueta verde',
        }}
        secondaryImage={{
          src: '/nfts/sage-nomad.png',
          alt: 'Sage Nomad, gorila de chapéu e moletom roxo',
        }}
        exploreTargetId={CATALOG_ID}
      />

      <CatalogSection
        id={CATALOG_ID}
        nfts={nfts}
        featuredNft={featuredNft}
        facets={catalogFacets}
        filters={filters}
        tab={search.tab ?? 'all'}
        sort={search.sort ?? 'recent'}
        page={search.page ?? 1}
        totalPages={4}
        onFiltersChange={(next) =>
          updateSearch({
            collections: next.collections.length ? next.collections : undefined,
            networks: next.networks.length ? next.networks : undefined,
            minPrice: next.price?.min,
            maxPrice: next.price?.max,
          })
        }
        onTabChange={(tab) => updateSearch({ tab: tab === 'all' ? undefined : tab })}
        onSortChange={(sort) => updateSearch({ sort: sort === 'recent' ? undefined : sort })}
        onPageChange={(page) => updateSearch({ page: page > 1 ? page : undefined }, true)}
        // Both actions need a session: without one, the auth dialog opens and the
        // action runs after sign-in.
        // TODO: call the cart / favorites mutations (optimistic update with rollback)
        onAddToCart={() => requireAuth(() => {})}
        onToggleFavorite={() => requireAuth(() => {})}
        isFiltersDrawerOpen={isFiltersDrawerOpen}
        onFiltersDrawerOpenChange={setFiltersDrawerOpen}
      />

      <PromoSection promos={promos} />
      <BlogSection posts={blogPosts} />
    </>
  )
}
