import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { authApi } from '@/api/endpoints'
import type { SocialProvider } from '@/types/account'
import { useAuth } from '../auth-context'
import type { SignInValues, SignUpValues } from '../validation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import closeIcon from '@/assets/icons/close.svg'
import type { AuthTab } from '../auth-search'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { SocialSignIn } from './SocialSignIn'

const TABS: { value: AuthTab; label: string; description: string }[] = [
  {
    value: 'entrar',
    label: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  {
    value: 'criar-conta',
    label: 'Criar conta',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
]

/**
 * Sign in / sign up dialog. Opened from any page through the `?auth=` search
 * param, so it survives a refresh and can be linked to directly.
 */
export function AuthDialog() {
  const { auth } = useSearch({ strict: false })
  const navigate = useNavigate()
  const { completeSignIn } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>()

  const activeTab = TABS.find((tab) => tab.value === auth) ?? TABS[0]

  function setTab(tab: AuthTab | undefined) {
    setStatus(null)
    setFieldErrors(undefined)
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, auth: tab }),
      replace: true,
      resetScroll: false,
    })
  }

  const authMutation = useMutation({
    mutationFn: (
      request:
        | { kind: 'sign-in'; values: SignInValues }
        | { kind: 'sign-up'; values: SignUpValues }
        | { kind: 'social'; provider: SocialProvider },
    ) => {
      if (request.kind === 'sign-in') return authApi.signIn(request.values)
      if (request.kind === 'sign-up') {
        const { username, email, password } = request.values
        return authApi.signUp({ username, email, password })
      }
      return authApi.social(request.provider)
    },
    onMutate: () => {
      setStatus(null)
      setFieldErrors(undefined)
    },
    onSuccess: (response) => {
      setTab(undefined)
      completeSignIn(response)
      toast.success(`Olá, ${response.user.displayName}!`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields)
      setStatus(error instanceof ApiError ? error.message : 'Não foi possível entrar. Tente novamente.')
    },
  })
  const isSubmitting = authMutation.isPending

  return (
    <Dialog open={auth !== undefined} onOpenChange={(open) => !open && setTab(undefined)}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-lg bg-surface-card p-0 pb-12 ring-0 sm:max-w-[500px]"
      >
        <DialogTitle className="sr-only">{activeTab.label}</DialogTitle>

        <button
          type="button"
          onClick={() => setTab(undefined)}
          aria-label="Fechar"
          className="absolute top-2.5 right-3 grid size-8 place-items-center rounded-md hover:bg-accent"
        >
          <img src={closeIcon} alt="" width={18} height={18} />
        </button>

        <div className="flex flex-col items-center gap-10 px-6 pt-12 sm:px-12">
          <div role="tablist" aria-label="Acesso" className="flex items-center gap-2">
            {TABS.map((tab, index) => {
              const isActive = tab.value === activeTab.value
              return (
                <div key={tab.value} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden className="h-5 w-px bg-[#f0805f]" />}
                  <button
                    type="button"
                    role="tab"
                    id={`auth-tab-${tab.value}`}
                    aria-selected={isActive}
                    aria-controls="auth-panel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setTab(tab.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length]
                        setTab(next.value)
                        document.getElementById(`auth-tab-${next.value}`)?.focus()
                      }
                    }}
                    className={cn(
                      'text-xl leading-4 font-medium transition-colors',
                      isActive ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
                    )}
                  >
                    {tab.label}
                  </button>
                </div>
              )
            })}
          </div>
          <DialogDescription className="text-center text-caption leading-4 text-foreground">
            {activeTab.description}
          </DialogDescription>
        </div>

        <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${activeTab.value}`}>
          {activeTab.value === 'entrar' ? (
            <SignInForm
              isSubmitting={isSubmitting}
              serverErrors={fieldErrors}
              onSubmit={(values) => authMutation.mutate({ kind: 'sign-in', values })}
            />
          ) : (
            <SignUpForm
              isSubmitting={isSubmitting}
              serverErrors={fieldErrors}
              onSubmit={(values) => authMutation.mutate({ kind: 'sign-up', values })}
            />
          )}
          <p role="status" className="px-6 pt-3 text-center text-sm text-destructive empty:hidden sm:px-20">
            {status}
          </p>
          <SocialSignIn
            disabled={isSubmitting}
            onSelect={(provider) => authMutation.mutate({ kind: 'social', provider })}
          />
        </div>

        {/* Accent bar at the bottom of the modal, from the design */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-2.5 bg-primary" />
      </DialogContent>
    </Dialog>
  )
}
