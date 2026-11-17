import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AuthContext, type SessionUser } from './auth-context'
import type { AuthTab } from './auth-search'

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: hydrate from the session endpoint (GET /api/session) once the API exists
  const [user, setUser] = useState<SessionUser | null>(null)
  const pendingAction = useRef<(() => void) | null>(null)
  const navigate = useNavigate()

  const openAuthDialog = useCallback(
    (tab: AuthTab = 'entrar') => {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, auth: tab }),
        resetScroll: false,
      })
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

  const completeSignIn = useCallback((signedInUser: SessionUser) => {
    setUser(signedInUser)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }, [])

  const signOut = useCallback(() => {
    // TODO: call POST /api/session/logout once the API exists
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, requireAuth, openAuthDialog, completeSignIn, signOut }),
    [user, requireAuth, openAuthDialog, completeSignIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
