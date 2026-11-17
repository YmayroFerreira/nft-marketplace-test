import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'

interface RequireAuthProps {
  children: ReactNode
  /** Explains why the page needs an account */
  message: string
}

/** Renders the page only with a session; otherwise asks the user to sign in */
export function RequireAuth({ children, message }: RequireAuthProps) {
  const { user, isLoadingSession, openAuthDialog } = useAuth()

  if (isLoadingSession) {
    return (
      <div className="container-page py-16" aria-busy>
        <div className="skeleton-shimmer h-64 rounded-lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <section className="container-page py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-lg bg-surface-card px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-foreground">Entre na sua conta</h1>
          <p className="text-sm leading-6 text-text-secondary">{message}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="brand-lg" onClick={() => openAuthDialog('entrar')}>
              Entrar
            </Button>
            <Button size="brand-lg" variant="outline" onClick={() => openAuthDialog('criar-conta')}>
              Criar conta
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return children
}
