import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authApi, cartApi } from '@/api/endpoints'
import { getSessionToken, onSessionExpired, onSessionTokenChange, setSessionToken } from '@/api/session-token'
import type { AuthResponse } from '@/types/account'
import { accountKeys } from '../account/keys'
import { guestCart } from '../cart/guest-cart'
import { clearCheckoutDraft } from '../checkout/checkout-draft'
import { AuthContext } from './auth-context'
import type { AuthTab } from './auth-search'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pendingAction = useRef<(() => void) | null>(null)
  const token = useSyncExternalStore(onSessionTokenChange, getSessionToken)

  // Validates the stored token (e.g. after a refresh)
  const session = useQuery({
    queryKey: accountKeys.session(token),
    queryFn: authApi.session,
    enabled: token !== null,
    staleTime: Infinity,
    retry: false,
  })
  const user = token ? (session.data ?? null) : null

  // Signing out, or a 401 that clears the token, removes every user-scoped cache
  useEffect(() => {
    if (token === null) {
      queryClient.removeQueries({ queryKey: accountKeys.all })
      queryClient.removeQueries({ queryKey: ['session'] })
    }
  }, [token, queryClient])

  const openAuthDialog = useCallback(
    (tab: AuthTab = 'entrar') => {
      void navigate({ to: '.', search: (prev) => ({ ...prev, auth: tab }), resetScroll: false })
    },
    [navigate],
  )

  // Expired session: ask to sign in again on the same page, so the user can continue
  useEffect(
    () =>
      onSessionExpired(() => {
        toast.warning('Sua sessão expirou. Entre novamente para continuar de onde parou.')
        openAuthDialog('entrar')
      }),
    [openAuthDialog],
  )

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        action()
        return
      }
      pendingAction.current = action
      openAuthDialog('entrar')
    },
    [user, openAuthDialog],
  )

  const completeSignIn = useCallback(
    async (response: AuthResponse) => {
      queryClient.setQueryData(accountKeys.session(response.token), response.user)
      setSessionToken(response.token)

      // The visitor cart is moved into the account before anything else
      const guest = guestCart.get()
      if (guest.items.length > 0 || guest.promoCode) {
        try {
          const result = await cartApi.merge(guest)
          queryClient.setQueryData(accountKeys.cart(response.user.id), result.cart)
          guestCart.clear()
          if (guest.items.length > 0) toast.success('Os itens do seu carrinho foram adicionados à sua conta.')
          for (const adjustment of result.adjustments) toast.warning(adjustment)
        } catch {
          // The visitor cart stays in the browser and can be merged on the next sign-in
          toast.error('Não foi possível juntar o carrinho de visitante à sua conta. Os itens continuam salvos.')
        }
      }

      const action = pendingAction.current
      pendingAction.current = null
      // Run after React has the new user, so the action sees the session
      if (action) setTimeout(action, 0)
    },
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut()
    } catch {
      // The local session is cleared even if the request fails
    }
    // A deliberate sign-out also drops private data kept for the checkout
    clearCheckoutDraft()
    setSessionToken(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoadingSession: token !== null && session.isPending,
      requireAuth,
      openAuthDialog,
      completeSignIn,
      signOut,
    }),
    [user, token, session.isPending, requireAuth, openAuthDialog, completeSignIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
