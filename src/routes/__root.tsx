import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { parseAuthTab, type AuthTab } from '@/features/auth/auth-search'
import { AuthDialog } from '@/features/auth/components/AuthDialog'

interface RouterContext {
  queryClient: QueryClient
}

interface RootSearch {
  /** Opens the auth dialog on top of the current page */
  auth?: AuthTab
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search: Record<string, unknown>): RootSearch => ({
    auth: parseAuthTab(search.auth),
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <AuthProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        {/* TODO: cartCount comes from the cart query once the API exists */}
        <Header cartCount={6} />
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <AuthDialog />
    </AuthProvider>
  )
}
