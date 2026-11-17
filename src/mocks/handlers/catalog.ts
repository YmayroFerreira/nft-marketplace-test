import { http, HttpResponse } from 'msw'
import type {
  CatalogFacets,
  CatalogSort,
  CatalogTab,
  Network,
  Nft,
  NftDetail,
  NftReview,
  Paginated,
} from '@/types/catalog'
import { getDb } from '../db'
import { COLLECTIONS, createSeedReviews, FEATURED_NFT_ID, NETWORKS } from '../fixtures/nfts'
import { API, apiError, simulateNetwork } from '../http-utils'
import { getScenario } from '../scenarios'

const DEFAULT_PAGE_SIZE = 9
const MAX_PAGE_SIZE = 36
const NEW_LISTING_DAYS = 14
const DAY = 24 * 60 * 60 * 1000

/** Strips detail-only fields so list endpoints return the lighter `Nft` shape */
export function toListItem(nft: NftDetail): Nft {
  return {
    id: nft.id,
    name: nft.name,
    imageUrl: nft.imageUrl,
    price: nft.price,
    previousPrice: nft.previousPrice,
    collectionId: nft.collectionId,
    network: nft.network,
    rarity: nft.rarity,
    availableEditions: nft.availableEditions,
    totalEditions: nft.totalEditions,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

function catalogNfts() {
  return getScenario().emptyCatalog ? [] : Object.values(getDb().nfts)
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function soldRatio(nft: NftDetail) {
  return (nft.totalEditions - nft.availableEditions) / nft.totalEditions
}

function catalogError() {
  return getScenario().catalogError
    ? apiError(500, 'internal_error', 'Não foi possível carregar o catálogo.')
    : null
}

export const catalogHandlers = [
  http.get(`${API}/nfts/facets`, async () => {
    const failure = (await simulateNetwork()) ?? catalogError()
    if (failure) return failure

    const nfts = catalogNfts()
    const prices = nfts.map((nft) => nft.price)
    const facets: CatalogFacets = {
      collections: COLLECTIONS.map((c) => ({
        id: c.id,
        name: c.name,
        count: nfts.filter((nft) => nft.collectionId === c.id).length,
      })),
      networks: NETWORKS.map((n) => ({
        id: n.id,
        name: n.name,
        count: nfts.filter((nft) => nft.network === n.id).length,
      })),
      priceRange: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
    }
    return HttpResponse.json(facets)
  }),

  http.get(`${API}/nfts/featured`, async () => {
    const failure = (await simulateNetwork()) ?? catalogError()
    if (failure) return failure

    const nft = getScenario().emptyCatalog ? undefined : getDb().nfts[FEATURED_NFT_ID]
    return nft
      ? HttpResponse.json(toListItem(nft))
      : apiError(404, 'not_found', 'Nenhum NFT em destaque.')
  }),

  http.get(`${API}/nfts`, async ({ request }) => {
    const failure = (await simulateNetwork()) ?? catalogError()
    if (failure) return failure

    const params = new URL(request.url).searchParams
    const page = Math.max(1, Number(params.get('page')) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get('pageSize')) || DEFAULT_PAGE_SIZE))
    const tab = (params.get('tab') ?? 'all') as CatalogTab
    const sort = (params.get('sort') ?? 'recent') as CatalogSort
    const collections = params.getAll('collections')
    const networks = params.getAll('networks') as Network[]
    const minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : undefined
    const maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined
    const q = params.get('q')?.trim()

    let nfts = catalogNfts()
    if (collections.length) nfts = nfts.filter((nft) => collections.includes(nft.collectionId))
    if (networks.length) nfts = nfts.filter((nft) => networks.includes(nft.network))
    if (minPrice !== undefined) nfts = nfts.filter((nft) => nft.price >= minPrice)
    if (maxPrice !== undefined) nfts = nfts.filter((nft) => nft.price <= maxPrice)
    if (q) nfts = nfts.filter((nft) => normalize(nft.name).includes(normalize(q)))

    if (tab === 'new') {
      const newest = Math.max(...nfts.map((nft) => Date.parse(nft.listedAt)))
      nfts = nfts.filter((nft) => newest - Date.parse(nft.listedAt) <= NEW_LISTING_DAYS * DAY)
    }
    if (tab === 'trending') {
      nfts = [...nfts].sort((a, b) => soldRatio(b) - soldRatio(a)).slice(0, 12)
    }

    nfts = [...nfts].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price
      if (sort === 'price-desc') return b.price - a.price
      return Date.parse(b.listedAt) - Date.parse(a.listedAt)
    })

    const totalItems = nfts.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const body: Paginated<Nft> = {
      items: nfts.slice((page - 1) * pageSize, page * pageSize).map(toListItem),
      page,
      pageSize,
      totalPages,
      totalItems,
    }
    return HttpResponse.json(body)
  }),

  http.get(`${API}/nfts/:id/reviews`, async ({ params, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const id = String(params.id)
    if (!getDb().nfts[id]) return apiError(404, 'not_found', 'NFT não encontrado.')

    const search = new URL(request.url).searchParams
    const page = Math.max(1, Number(search.get('page')) || 1)
    const pageSize = 5
    const reviews = createSeedReviews(id)
    const body: Paginated<NftReview> = {
      items: reviews.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      totalPages: Math.ceil(reviews.length / pageSize),
      totalItems: reviews.length,
    }
    return HttpResponse.json(body)
  }),

  http.get(`${API}/nfts/:id/related`, async ({ params, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const nft = getDb().nfts[String(params.id)]
    if (!nft) return apiError(404, 'not_found', 'NFT não encontrado.')

    const limit = Math.min(12, Number(new URL(request.url).searchParams.get('limit')) || 5)
    const others = catalogNfts().filter((other) => other.id !== nft.id)
    // Same collection first, then the rest of the catalog
    const related = [
      ...others.filter((other) => other.collectionName === nft.collectionName),
      ...others.filter((other) => other.collectionName !== nft.collectionName),
    ]
    return HttpResponse.json(related.slice(0, limit).map(toListItem))
  }),

  http.get(`${API}/nfts/:id`, async ({ params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const nft = getDb().nfts[String(params.id)]
    return nft ? HttpResponse.json(nft) : apiError(404, 'not_found', 'NFT não encontrado.')
  }),
]
