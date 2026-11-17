export type Network = 'ethereum' | 'polygon' | 'solana'

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
}

export type NftRarity = 'common' | 'rare'

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

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
}
