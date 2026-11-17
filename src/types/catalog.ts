export type Network = 'ethereum' | 'polygon' | 'solana'

export type NftRarity = 'common' | 'rare'

/** NFT as shown in lists (catalog grid, related items, cart suggestions) */
export interface Nft {
  id: string
  name: string
  imageUrl: string
  /** Current price in ETH */
  price: number
  /** Previous price in ETH, shown struck through when the NFT is discounted */
  previousPrice?: number
  collectionId: string
  network: Network
  /** Rare NFTs show the "RARO" badge */
  rarity?: NftRarity
  /** Editions still available for purchase */
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
  /** Edition sizes shown as options in the design (1/1, 1/10, 1/50, ABERTA) */
  editionOptions: string[]
  rating: { average: number; count: number }
  contract: {
    address: string
    standard: 'ERC-721' | 'ERC-1155'
    royaltyPercent: number
    storage: string
  }
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
  min: number
  max: number
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
  minPrice?: number
  maxPrice?: number
  q?: string
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
}
