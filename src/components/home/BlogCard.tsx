import { formatShortDate } from '@/lib/format'
import type { BlogPost } from '@/types/content'

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-surface-card">
      <img
        src={post.imageUrl}
        alt=""
        width={268}
        height={195}
        loading="lazy"
        decoding="async"
        className="h-[195px] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <p className="text-xs leading-4 font-medium whitespace-pre-wrap text-text-secondary">
          <time dateTime={post.publishedAt}>{formatShortDate(post.publishedAt)}</time>
          {'  |  '}Leitura de {post.readingMinutes} min
        </p>
        <h3 className="text-base font-bold text-text-primary">{post.title}</h3>
        <p className="text-xs leading-4 font-medium text-text-secondary">{post.excerpt}</p>
        {/* TODO: link to the article page when the blog exists */}
        <span className="mt-auto flex gap-1 text-xs text-text-accent">
          <span className="leading-[14px] font-bold">Ler mais</span>
          <span aria-hidden>→</span>
        </span>
      </div>
    </article>
  )
}
