import type { Network, NftDetail, NftRarity, NftReview } from '@/types/catalog'

/**
 * Seed data for the mock API. Only the mock handlers read this file; the app
 * always gets data through the REST API.
 *
 * The first nine NFTs are the ones shown in the Figma; the rest are generated
 * deterministically so pagination and facet counts are meaningful.
 */

export const COLLECTIONS = [
  { id: 'digital-art', name: 'Arte digital' },
  { id: 'photography', name: 'Fotografia' },
  { id: 'music', name: 'Música' },
  { id: '3d-art', name: 'Arte 3D' },
  { id: 'collectibles', name: 'Colecionáveis' },
  { id: 'generative', name: 'Generativa' },
  { id: 'games', name: 'Jogos' },
  { id: 'memberships', name: 'Assinaturas' },
  { id: 'utility', name: 'Utilidade' },
] as const

export const NETWORKS: { id: Network; name: string }[] = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'solana', name: 'Solana' },
]

const ART = {
  emeraldApe: '/nfts/emerald-ape.png',
  sageNomad: '/nfts/sage-nomad.png',
  neonVessel: '/nfts/neon-vessel.png',
  goldenBeat: '/nfts/golden-beat.png',
}

interface SeedNft {
  name: string
  imageUrl: string
  price: number
  previousPrice?: number
  collectionId: string
  network: Network
  rarity?: NftRarity
  collectionName: string
  attributes: string[]
}

/** The nine NFTs from the Figma home grid, in order */
const FIGMA_NFTS: SeedNft[] = [
  { name: 'Emerald Ape #042', imageUrl: ART.emeraldApe, price: 1.19, collectionId: 'digital-art', network: 'ethereum', collectionName: 'Kurio Apes', attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  { name: 'Sage Nomad #009', imageUrl: ART.sageNomad, price: 1.69, collectionId: 'digital-art', network: 'ethereum', collectionName: 'Nomads', attributes: ['Chapéu', 'Moletom', 'Sereno'] },
  { name: 'Neon Vessel #552', imageUrl: ART.neonVessel, price: 1.99, previousPrice: 2.29, collectionId: 'collectibles', network: 'polygon', rarity: 'rare', collectionName: 'Vessels', attributes: ['Blazer', 'Gola alta', 'Brinco'] },
  { name: 'Cosmic Bloom #118', imageUrl: ART.sageNomad, price: 1.29, collectionId: 'generative', network: 'solana', collectionName: 'Nomads', attributes: ['Chapéu', 'Moletom', 'Cósmico'] },
  { name: 'Violet Nomad #314', imageUrl: ART.sageNomad, price: 1.39, collectionId: 'digital-art', network: 'ethereum', collectionName: 'Nomads', attributes: ['Chapéu', 'Violeta', 'Sereno'] },
  { name: 'Ivory Baron #088', imageUrl: ART.neonVessel, price: 1.79, collectionId: 'photography', network: 'polygon', collectionName: 'Vessels', attributes: ['Blazer', 'Marfim', 'Clássico'] },
  { name: 'Golden Beat #207', imageUrl: ART.goldenBeat, price: 0.99, collectionId: 'music', network: 'ethereum', collectionName: 'Golden Sound', attributes: ['Fones', 'Dourado', 'Ritmo'] },
  { name: 'Golden Frequency #071', imageUrl: ART.goldenBeat, price: 0.59, collectionId: 'music', network: 'solana', collectionName: 'Golden Sound', attributes: ['Fones', 'Dourado', 'Frequência'] },
  { name: 'Golden Signal #160', imageUrl: ART.goldenBeat, price: 0.39, collectionId: 'music', network: 'polygon', collectionName: 'Golden Sound', attributes: ['Fones', 'Dourado', 'Sinal'] },
]

const GENERATED_NAMES = [
  'Amber', 'Velvet', 'Lunar', 'Copper', 'Jade', 'Onyx', 'Saffron', 'Crimson', 'Ivory',
  'Cobalt', 'Hazel', 'Rustic', 'Solar', 'Misty', 'Golden', 'Silent', 'Wild', 'Royal',
  'Echo', 'Prism', 'Drift', 'Ember', 'Quartz', 'Atlas', 'Nova', 'Orbit', 'Pixel',
]
const GENERATED_SUFFIXES = ['Ape', 'Nomad', 'Vessel', 'Beat']
const SUFFIX_ART = [ART.emeraldApe, ART.sageNomad, ART.neonVessel, ART.goldenBeat]
const SUFFIX_COLLECTION = ['Kurio Apes', 'Nomads', 'Vessels', 'Golden Sound']
const NETWORK_IDS: Network[] = ['ethereum', 'polygon', 'solana']

function generatedNfts(count: number): SeedNft[] {
  return Array.from({ length: count }, (_, i) => {
    const kind = i % 4
    const collection = COLLECTIONS[(i * 5 + 3) % COLLECTIONS.length]
    const number = String(200 + i * 13).padStart(3, '0')
    // Deterministic price between 0.05 and 12.30 ETH
    const price = Math.round((0.05 + ((i * 37) % 100) * 0.1225) * 100) / 100
    return {
      name: `${GENERATED_NAMES[i % GENERATED_NAMES.length]} ${GENERATED_SUFFIXES[kind]} #${number}`,
      imageUrl: SUFFIX_ART[kind],
      price,
      previousPrice: i % 7 === 0 ? Math.round(price * 1.15 * 100) / 100 : undefined,
      collectionId: collection.id,
      network: NETWORK_IDS[(i * 2 + 1) % 3],
      rarity: i % 9 === 4 ? 'rare' : 'common',
      collectionName: SUFFIX_COLLECTION[kind],
      attributes: ['Edição Kurio', GENERATED_NAMES[i % GENERATED_NAMES.length], collection.name],
    }
  })
}

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const BASE_DATE = Date.UTC(2026, 9, 1)
const DAY = 24 * 60 * 60 * 1000

function toDetail(seed: SeedNft, index: number): NftDetail {
  const tokenNumber = seed.name.split('#')[1] ?? String(index)
  // The Figma NFTs have 50 editions so the cart design (2, 6 and 9 editions) fits
  const totalEditions = index < FIGMA_NFTS.length ? 50 : [1, 10, 50][index % 3]
  return {
    id: slugify(seed.name),
    name: seed.name,
    imageUrl: seed.imageUrl,
    price: seed.price,
    previousPrice: seed.previousPrice,
    collectionId: seed.collectionId,
    network: seed.network,
    rarity: seed.rarity ?? 'common',
    totalEditions,
    availableEditions: Math.max(1, totalEditions - (index % 4)),
    // Index 0 is the most recently listed
    listedAt: new Date(BASE_DATE - index * DAY).toISOString(),
    version: 1,
    tokenId: `#${tokenNumber.padStart(4, '0')}`,
    collectionName: seed.collectionName,
    creator: 'Nova Sato',
    summary: `Um colecionável digital 1/${totalEditions} finalizado à mão da coleção Kurio Editions, verificado na ${NETWORKS.find((n) => n.id === seed.network)?.name}, com arte desbloqueável e acesso para colecionadores.`,
    description: [
      `${seed.name} é uma obra digital 1/${totalEditions} finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    gallery: [seed.imageUrl, ART.emeraldApe, ART.sageNomad, ART.goldenBeat].filter(
      (url, i, all) => all.indexOf(url) === i,
    ),
    attributes: seed.attributes.map((value, i) => ({ trait: ['Acessório', 'Detalhe', 'Estilo'][i], value })),
    editionOptions: ['1/1', '1/10', '1/50', 'ABERTA'],
    rating: { average: 4.8, count: 19 },
    contract: {
      address: '0x7A42...19E8',
      standard: 'ERC-721',
      royaltyPercent: 5,
      storage: 'IPFS',
    },
  }
}

export function createSeedNfts(): NftDetail[] {
  return [...FIGMA_NFTS, ...generatedNfts(27)].map(toDetail)
}

/** NFT shown in the "NFT em destaque" banner */
export const FEATURED_NFT_ID = 'sage-nomad-009'

const REVIEW_COMMENTS = [
  'Arte impecável e entrega instantânea na carteira.',
  'Os detalhes em alta resolução são incríveis.',
  'Ótima procedência, recomendo a coleção inteira.',
  'Comprei duas edições, a comunidade é muito ativa.',
  'Atendimento rápido e transação sem complicação.',
]
const REVIEW_AUTHORS = ['ana.eth', 'colecionador42', 'pixelhunter', 'lu.nft', 'marcos.sol']

export function createSeedReviews(nftId: string): NftReview[] {
  return Array.from({ length: 19 }, (_, i) => ({
    id: `${nftId}-review-${i + 1}`,
    author: REVIEW_AUTHORS[i % REVIEW_AUTHORS.length],
    rating: i % 5 === 0 ? 4 : 5,
    comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
    createdAt: new Date(BASE_DATE - i * 3 * DAY).toISOString(),
  }))
}
