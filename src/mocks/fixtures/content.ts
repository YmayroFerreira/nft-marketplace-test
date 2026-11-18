import type { BlogPost, Promo } from '@/types/content'

export const promos: Promo[] = [
  {
    id: 'genesis-drops',
    title: 'Lançamentos gênesis de edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    imageUrl: '/nfts/emerald-ape.webp',
    href: '/',
  },
  {
    id: 'curated-art',
    title: 'Arte digital selecionada e muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    imageUrl: '/nfts/neon-vessel.webp',
    href: '/',
  },
]

export const blogPosts: BlogPost[] = [
  { id: 'how-nft-ownership-works', title: 'Como funciona a propriedade de NFTs', excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.', imageUrl: '/nfts/neon-vessel.webp', publishedAt: '2026-09-12', readingMinutes: 6 },
  { id: '10-digital-artists', title: '10 artistas digitais para acompanhar', excerpt: 'Conheça criadores que moldam a cultura digital.', imageUrl: '/nfts/emerald-ape.webp', publishedAt: '2026-09-13', readingMinutes: 2 },
  { id: 'rarity-traits-provenance', title: 'Raridade, atributos e procedência', excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.', imageUrl: '/nfts/sage-nomad.webp', publishedAt: '2026-09-15', readingMinutes: 3 },
  { id: 'protect-your-wallet', title: 'Como proteger sua carteira', excerpt: 'Proteja sua carteira, seus ativos e sua identidade.', imageUrl: '/nfts/golden-beat.webp', publishedAt: '2026-09-15', readingMinutes: 2 },
]
