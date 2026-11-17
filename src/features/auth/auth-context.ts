import { createContext, useContext } from 'react'
import type { AuthTab } from './auth-search'

export interface SessionUser {
  id: string
  username: string
  email: string
}

export interface AuthContextValue {
  user: SessionUser | null
  /**
   * Runs `action` when there is a session. Otherwise opens the auth dialog and
   * runs `action` right after the user signs in.
   */
  requireAuth: (action: () => void) => void
  openAuthDialog: (tab?: AuthTab) => void
  /** Called by the auth dialog after the API confirms the sign-in */
  completeSignIn: (user: SessionUser) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
