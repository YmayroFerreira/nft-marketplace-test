import type { EthString } from '@/lib/eth'

export type Network = 'ethereum' | 'polygon' | 'solana'

export type NftRarity = 'common' | 'rare'

/** NFT as shown in lists (catalog grid, related items, cart suggestions) */
export interface Nft {
  id: string
  name: string
  imageUrl: string
  /** Price of the default edition, as a decimal string ("1.19") */
  price: EthString
  /** Previous price of the default edition, shown struck through when discounted */
  previousPrice?: EthString
  /** Edition used by quick actions (add to cart from a card) */
  defaultEditionId: EditionId
  collectionId: string
  network: Network
  /** Rare NFTs show the "RARO" badge */
  rarity?: NftRarity
  /** Copies still available, summed over all editions */
  availableEditions: number
  totalEditions: number
  /** ISO date the NFT was listed */
  listedAt: string
  /** Increases on every change; used to reconcile REST data with realtime events */
  version: number
}

export interface NftAttribute {
  trait: string
  value: string
}

/** Full NFT for the details page */
export interface NftDetail extends Nft {
  tokenId: string
  collectionName: string
  creator: string
  summary: string
  /** Long description, one paragraph per item */
  description: string[]
  gallery: string[]
  attributes: NftAttribute[]
  /** Edition options from the design (1/1, 1/10, 1/50, ABERTA), each with its own price and stock */
  editions: NftEdition[]
  rating: { average: number; count: number }
  contract: {
    address: string
    standard: 'ERC-721' | 'ERC-1155'
    royaltyPercent: number
    storage: string
  }
}

export type EditionId = '1-1' | '1-10' | '1-50' | 'open'

export interface NftEdition {
  id: EditionId
  /** Label shown in the design: "1/1", "1/10", "1/50", "ABERTA" */
  label: string
  price: EthString
  /** Copies left for sale; 0 means the edition is unavailable */
  available: number
  total: number
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface CollectionFacet {
  id: string
  name: string
  count: number
}

export interface NetworkFacet {
  id: Network
  name: string
  count: number
}

export interface PriceRange {
  min: EthString
  max: EthString
}

export interface CatalogFacets {
  collections: CollectionFacet[]
  networks: NetworkFacet[]
  priceRange: PriceRange
}

export type CatalogTab = 'all' | 'new' | 'trending'
export type CatalogSort = 'recent' | 'price-asc' | 'price-desc'

export interface CatalogQuery {
  page?: number
  pageSize?: number
  tab?: CatalogTab
  sort?: CatalogSort
  collections?: string[]
  networks?: Network[]
  minPrice?: EthString
  maxPrice?: EthString
  q?: string
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
}
