import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { catalogApi, contentApi } from '@/api/endpoints'
import type { CatalogQuery } from '@/types/catalog'

/** Query keys and fetchers of the catalog. Realtime events update these caches. */
export const catalogKeys = {
  all: ['catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (query: CatalogQuery) => [...catalogKeys.lists(), query] as const,
  facets: () => [...catalogKeys.all, 'facets'] as const,
  featured: () => [...catalogKeys.all, 'featured'] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
  related: (id: string) => [...catalogKeys.all, 'related', id] as const,
  reviews: (id: string, page: number) => [...catalogKeys.all, 'reviews', id, page] as const,
}

export const catalogQueries = {
  list: (query: CatalogQuery) =>
    queryOptions({
      queryKey: catalogKeys.list(query),
      queryFn: () => catalogApi.list(query),
      // Keep showing the current page while the next one loads
      placeholderData: keepPreviousData,
    }),
  facets: () =>
    queryOptions({ queryKey: catalogKeys.facets(), queryFn: catalogApi.facets, staleTime: 5 * 60_000 }),
  featured: () => queryOptions({ queryKey: catalogKeys.featured(), queryFn: catalogApi.featured }),
  detail: (id: string) => queryOptions({ queryKey: catalogKeys.detail(id), queryFn: () => catalogApi.detail(id) }),
  related: (id: string) =>
    queryOptions({ queryKey: catalogKeys.related(id), queryFn: () => catalogApi.related(id, 5) }),
  reviews: (id: string, page: number) =>
    queryOptions({
      queryKey: catalogKeys.reviews(id, page),
      queryFn: () => catalogApi.reviews(id, page),
      placeholderData: keepPreviousData,
    }),
}

export const contentQueries = {
  promos: () =>
    queryOptions({ queryKey: ['content', 'promos'], queryFn: contentApi.promos, staleTime: 10 * 60_000 }),
  blogPosts: () =>
    queryOptions({ queryKey: ['content', 'blog'], queryFn: contentApi.blogPosts, staleTime: 10 * 60_000 }),
}
