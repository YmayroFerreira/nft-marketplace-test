import { SectionHeader } from '@/components/common/SectionHeader'
import { BlogCard } from './BlogCard'
import type { BlogPost } from '@/types/content'

interface BlogSectionProps {
  posts: BlogPost[]
}

export function BlogSection({ posts }: BlogSectionProps) {
  return (
    <section aria-labelledby="blog-title" className="container-page mt-16 flex flex-col gap-8 md:mt-24 md:gap-10">
      <SectionHeader
        id="blog-title"
        title="Diário da Cunhagem"
        subtitle="Histórias, guias e insights para colecionadores sobre o universo da propriedade digital."
      />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <li key={post.id} className="flex">
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  )
}
