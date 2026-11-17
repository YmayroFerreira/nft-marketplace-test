import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'

const LINKS = [
  { to: '/perfil', label: 'Perfil do colecionador' },
  { to: '/carteiras', label: 'Carteiras' },
] as const

/** "Meu perfil" area shared by the profile and wallets screens */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    void navigate({ to: '/' })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="flex h-fit flex-col gap-4 rounded-lg bg-surface-card p-5">
        <p className="text-lg font-bold text-foreground">Meu perfil</p>
        <nav aria-label="Minha conta">
          <ul className="flex gap-4 lg:flex-col lg:gap-2">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-text-secondary hover:text-text-accent data-[status=active]:font-bold data-[status=active]:text-text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-fit text-sm text-foreground underline-offset-4 hover:text-destructive hover:underline"
        >
          Sair
        </button>
      </aside>
      <section aria-labelledby="account-title" className="flex flex-col gap-6">
        <h1 id="account-title" className="text-2xl font-bold text-foreground">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
