import { startTransition, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient, router } from './router'

export function renderApp(container: HTMLElement) {
  // The code and data of the current page start loading before the first render
  void router.preloadRoute({ to: window.location.pathname as '/' })

  const root = createRoot(container)
  // As a transition, the first render yields to the browser instead of blocking it
  startTransition(() => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    )
  })
}
