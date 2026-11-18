import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { useCart } from '@/features/cart/useCart'
import { useAuth } from '@/features/auth/auth-context'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { parseAuthTab, type AuthTab } from '@/features/auth/auth-search'
import { AuthDialog } from '@/features/auth/components/AuthDialog'
import { useRealtimeSync } from '@/features/realtime/useRealtimeSync'
import { cn } from '@/lib/utils'

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
      <AppShell />
    </AuthProvider>
  )
}

function AppShell() {
  useRealtimeSync()
  const { user } = useAuth()
  const cart = useCart()
  const cartCount = cart.data?.itemCount ?? 0
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // In the mobile frames, detail, cart and checkout have their own bottom action bars instead of the tab bar
  const showTabBar = !/^\/(nft|carrinho|pagamento)(\/|$)/.test(pathname)

  return (
    <>
      {/* Bottom padding on mobile keeps the content clear of the fixed tab bar */}
      <div className={cn('flex min-h-dvh flex-col md:pb-0', showTabBar && 'pb-[calc(72px+env(safe-area-inset-bottom))]')}>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <Header cartCount={cartCount} userName={user?.displayName} />
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      {showTabBar && <MobileTabBar cartCount={cartCount} />}
      <AuthDialog />
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          classNames: {
            toast: '!bg-surface-card !border-border !text-foreground !font-sans',
            description: '!text-text-secondary',
          },
        }}
      />
    </>
  )
}
