import { lazy, Suspense, useEffect, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState, useSearch } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/Header'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { useCart } from '@/features/cart/useCart'
import { useAuth } from '@/features/auth/auth-context'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { parseAuthTab, type AuthTab } from '@/features/auth/auth-search'
import { useRealtimeSync } from '@/features/realtime/useRealtimeSync'
import { cn } from '@/lib/utils'

// Below the fold on first load, so it does not delay the first paint
const Footer = lazy(() => import('@/components/layout/Footer').then((module) => ({ default: module.Footer })))

const loadAuthDialog = () => import('@/features/auth/components/AuthDialog')
const AuthDialog = lazy(() => loadAuthDialog().then((module) => ({ default: module.AuthDialog })))

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

/** Reserves the real height of the footer at each breakpoint, so the page does not jump */
function FooterPlaceholder() {
  return (
    <div
      aria-hidden
      className="mt-16 min-h-[2060px] sm:min-h-[1520px] md:mt-24 md:min-h-[1120px] lg:min-h-[910px] xl:min-h-[660px]"
    />
  )
}

/**
 * Keeps the dialog out of the first load: its code is fetched when the browser
 * is idle, so it still opens right away, and it stays mounted once opened for
 * the closing animation.
 */
function AuthDialogLoader() {
  const { auth } = useSearch({ strict: false })
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    const preload = () => void loadAuthDialog()
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload)
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(preload, 2000)
    return () => clearTimeout(id)
  }, [])

  if (auth !== undefined && !hasOpened) setHasOpened(true)
  if (!hasOpened) return null
  return (
    <Suspense fallback={null}>
      <AuthDialog />
    </Suspense>
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
      <div className={cn('flex min-h-(--page-height) flex-col md:pb-0', showTabBar && 'pb-[calc(72px+env(safe-area-inset-bottom))]')}>
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
        <Suspense fallback={<FooterPlaceholder />}>
          <Footer />
        </Suspense>
      </div>
      {showTabBar && <MobileTabBar cartCount={cartCount} />}
      <AuthDialogLoader />
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
