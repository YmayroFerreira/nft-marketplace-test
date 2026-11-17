import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AccountLayout } from '@/components/account/AccountLayout'
import { FormField } from '@/components/account/FormField'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useProfile, useProfileMutations } from '@/features/account/hooks'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/account'

export const Route = createFileRoute('/perfil')({
  component: ProfilePage,
})

/** Avatars come from the marketplace artworks (the mock API has no file upload) */
const AVATAR_OPTIONS = ['/nfts/emerald-ape.png', '/nfts/sage-nomad.png', '/nfts/neon-vessel.png', '/nfts/golden-beat.png']

function ProfilePage() {
  return (
    <div className="container-page mt-6 md:mt-10">
      <RequireAuth message="Entre para ver e editar seu perfil de colecionador.">
        <AccountLayout title="Perfil do colecionador">
          <ProfileContent />
        </AccountLayout>
      </RequireAuth>
    </div>
  )
}

function ProfileContent() {
  const profile = useProfile()
  if (profile.isPending) return <div className="skeleton-shimmer h-96 rounded-lg" aria-busy />
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />
  return (
    <>
      {/* Re-mount the form when the server data changes */}
      <ProfileForm key={profile.data.updatedAt} profile={profile.data} />
      <PasswordForm />
    </>
  )
}

function fieldErrors(error: unknown) {
  return error instanceof ApiError ? (error.fields ?? {}) : {}
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { update } = useProfileMutations()
  const [values, setValues] = useState({
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName?.replace(/\.eth$/, '') ?? '',
    walletNickname: profile.walletNickname ?? '',
    avatarUrl: profile.avatarUrl,
  })
  const errors = fieldErrors(update.error)

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update.mutate({
      ...values,
      ensName: values.ensName.trim() ? `${values.ensName.trim()}.eth` : null,
      walletNickname: values.walletNickname.trim() || null,
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg bg-surface-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nome de exibição"
          required
          value={values.displayName}
          error={errors.displayName}
          onChange={(e) => set('displayName', e.target.value)}
        />
        <FormField
          label="Nome de usuário"
          autoComplete="username"
          value={values.username}
          error={errors.username}
          onChange={(e) => set('username', e.target.value)}
        />
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <FormField
          label="Nome ENS"
          suffix=".eth"
          value={values.ensName}
          error={errors.ensName}
          onChange={(e) => set('ensName', e.target.value)}
        />
        <FormField
          label="Apelido da carteira"
          value={values.walletNickname}
          onChange={(e) => set('walletNickname', e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm text-foreground">Avatar</legend>
        <div className="flex flex-wrap items-center gap-3">
          {AVATAR_OPTIONS.map((src) => (
            <label
              key={src}
              className={cn(
                'cursor-pointer rounded-full border-2 p-0.5 has-focus-visible:outline-2 has-focus-visible:outline-ring',
                values.avatarUrl === src ? 'border-primary' : 'border-transparent',
              )}
            >
              <input
                type="radio"
                name="avatar"
                className="sr-only"
                checked={values.avatarUrl === src}
                onChange={() => set('avatarUrl', src)}
              />
              <img src={src} alt={`Avatar ${src.split('/').pop()?.replace('.png', '')}`} width={56} height={56} loading="lazy" className="size-14 rounded-full object-cover" />
            </label>
          ))}
          <Button type="button" size="brand-sm" variant="outline" onClick={() => set('avatarUrl', null)} disabled={!values.avatarUrl}>
            Remover
          </Button>
        </div>
      </fieldset>

      {update.isError && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-destructive">
          {update.error.message}
        </p>
      )}
      <Button type="submit" size="brand-lg" className="w-fit" disabled={update.isPending}>
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function PasswordForm() {
  const { changePassword } = useProfileMutations()
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [mismatch, setMismatch] = useState(false)
  const errors = fieldErrors(changePassword.error)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.newPassword !== values.confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => setValues({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby="password-title" className="flex flex-col gap-4 rounded-lg bg-surface-card p-6">
      <h2 id="password-title" className="text-lg font-bold text-foreground">
        Alterar senha
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          error={errors.currentPassword}
          onChange={(e) => setValues((v) => ({ ...v, currentPassword: e.target.value }))}
        />
        <FormField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          error={errors.newPassword}
          onChange={(e) => setValues((v) => ({ ...v, newPassword: e.target.value }))}
        />
        <FormField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          error={mismatch ? 'As senhas não coincidem.' : undefined}
          onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
        />
      </div>
      <Button type="submit" size="brand-lg" className="w-fit" disabled={changePassword.isPending}>
        {changePassword.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}
