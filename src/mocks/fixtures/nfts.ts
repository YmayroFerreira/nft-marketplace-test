import type { CatalogFacets, Nft } from '@/types/catalog'

export const nfts: Nft[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', imageUrl: '/nfts/emerald-ape.png', price: 1.19, collectionId: 'digital-art', network: 'ethereum' },
  { id: 'sage-nomad-009', name: 'Sage Nomad #009', imageUrl: '/nfts/sage-nomad.png', price: 1.69, collectionId: 'digital-art', network: 'ethereum' },
  { id: 'neon-vessel-552', name: 'Neon Vessel #552', imageUrl: '/nfts/neon-vessel.png', price: 1.99, previousPrice: 2.29, collectionId: 'collectibles', network: 'polygon' },
  { id: 'cosmic-bloom-118', name: 'Cosmic Bloom #118', imageUrl: '/nfts/sage-nomad.png', price: 1.29, collectionId: 'generative', network: 'solana' },
  { id: 'violet-nomad-314', name: 'Violet Nomad #314', imageUrl: '/nfts/sage-nomad.png', price: 1.39, collectionId: 'digital-art', network: 'ethereum' },
  { id: 'ivory-baron-088', name: 'Ivory Baron #088', imageUrl: '/nfts/neon-vessel.png', price: 1.79, collectionId: 'photography', network: 'polygon' },
  { id: 'golden-beat-207', name: 'Golden Beat #207', imageUrl: '/nfts/golden-beat.png', price: 0.99, collectionId: 'music', network: 'ethereum' },
  { id: 'golden-rhythm-211', name: 'Golden Rhythm #211', imageUrl: '/nfts/golden-beat.png', price: 0.89, collectionId: 'music', network: 'solana' },
  { id: 'golden-signal-160', name: 'Golden Signal #160', imageUrl: '/nfts/golden-beat.png', price: 0.39, collectionId: 'music', network: 'polygon' },
]

export const featuredNft: Nft = {
  id: 'sage-nomad-001',
  name: 'Sage Nomad #001',
  imageUrl: '/nfts/sage-nomad.png',
  price: 2.49,
  collectionId: 'digital-art',
  network: 'ethereum',
}

export const catalogFacets: CatalogFacets = {
  collections: [
    { id: 'digital-art', name: 'Arte digital', count: 33 },
    { id: 'photography', name: 'Fotografia', count: 12 },
    { id: 'music', name: 'Música', count: 65 },
    { id: '3d-art', name: 'Arte 3D', count: 39 },
    { id: 'collectibles', name: 'Colecionáveis', count: 23 },
    { id: 'generative', name: 'Generativa', count: 17 },
    { id: 'games', name: 'Jogos', count: 19 },
    { id: 'memberships', name: 'Assinaturas', count: 13 },
    { id: 'utility', name: 'Utilidade', count: 18 },
  ],
  networks: [
    { id: 'ethereum', name: 'Ethereum', count: 119 },
    { id: 'polygon', name: 'Polygon', count: 78 },
    { id: 'solana', name: 'Solana', count: 86 },
  ],
  priceRange: { min: 0.02, max: 12.3 },
}
