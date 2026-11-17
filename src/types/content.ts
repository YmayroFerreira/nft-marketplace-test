export interface BlogPost {
  id: string
  title: string
  excerpt: string
  imageUrl: string
  /** ISO date */
  publishedAt: string
  readingMinutes: number
}

export interface Promo {
  id: string
  title: string
  description: string
  imageUrl: string
  href: string
}
