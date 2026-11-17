import { createContext, useContext } from 'react'
import type { AuthResponse, User } from '@/types/account'
import type { AuthTab } from './auth-search'

export interface AuthContextValue {
  user: User | null
  /** True while a stored token is being validated with the API */
  isLoadingSession: boolean
  /**
   * Runs `action` when there is a session. Otherwise opens the auth dialog and
   * runs `action` right after the user signs in.
   */
  requireAuth: (action: () => void) => void
  openAuthDialog: (tab?: AuthTab) => void
  /** Called by the auth dialog after the API confirms the sign-in or sign-up */
  completeSignIn: (response: AuthResponse) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
