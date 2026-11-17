import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header goes here */}
      <main className="flex-1">
        <Outlet />
      </main>
      {/* Footer goes here */}
    </div>
  )
}
