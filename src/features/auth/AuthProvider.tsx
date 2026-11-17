import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/endpoints'
import { getSessionToken, onSessionTokenChange, setSessionToken } from '@/api/session-token'
import type { AuthResponse } from '@/types/account'
import { accountKeys } from '../account/keys'
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
    (response: AuthResponse) => {
      queryClient.setQueryData(accountKeys.session(response.token), response.user)
      setSessionToken(response.token)
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
