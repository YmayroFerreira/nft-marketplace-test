import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { ApiError } from './api/client'
import { routeTree } from './routeTree.gen'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Catalog data changes through realtime events, so a short stale time is enough
      staleTime: 30_000,
      // Retry only network errors and 5xx; 4xx (not found, unauthorized...) are final
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES && (!(error instanceof ApiError) || error.isRetryable),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Mutations are never retried automatically; orders use idempotency keys instead
      retry: false,
    },
  },
})

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
