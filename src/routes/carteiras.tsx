import { useId, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { AccountLayout } from '@/components/account/AccountLayout'
import { FormField } from '@/components/account/FormField'
import { WalletMark } from '@/components/account/WalletMark'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useWalletMutations, useWallets } from '@/features/account/hooks'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { cn } from '@/lib/utils'
import { shortHash } from '@/lib/format'
import { NETWORK_LABELS, WALLET_PROVIDERS, walletProviderLabel } from '@/lib/wallets'
import type { CreateWalletRequest, Wallet, WalletProvider } from '@/types/account'
import type { Network } from '@/types/catalog'

export const Route = createFileRoute('/carteiras')({
  component: WalletsPage,
})

function WalletsPage() {
  return (
    <div className="container-page mt-6 md:mt-10">
      <RequireAuth message="Entre para gerenciar as carteiras que recebem seus NFTs.">
        <AccountLayout title="Carteiras">
          <WalletsContent />
        </AccountLayout>
      </RequireAuth>
    </div>
  )
}

function WalletsContent() {
  const wallets = useWallets()
  const [isAdding, setIsAdding] = useState(false)

  if (wallets.isPending) return <div className="skeleton-shimmer h-80 rounded-lg" aria-busy />
  if (wallets.isError) return <ErrorState message={wallets.error.message} onRetry={() => void wallets.refetch()} />

  const primary = wallets.data.find((w) => w.isPrimary)
  const secondary = wallets.data.filter((w) => !w.isPrimary)

  return (
    <>
      <p className="text-sm text-text-secondary">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>

      <section aria-labelledby="primary-wallet-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="primary-wallet-title" className="text-lg font-bold text-foreground">
            Carteira principal
          </h2>
          {!isAdding && (
            <Button size="brand-md" onClick={() => setIsAdding(true)}>
              Adicionar
            </Button>
          )}
        </div>
        {primary ? (
          <WalletCard wallet={primary} />
        ) : (
          <p className="rounded-lg bg-surface-card p-5 text-sm text-text-secondary">
            Você ainda não adicionou uma carteira.
          </p>
        )}
      </section>

      {isAdding && <AddWalletForm onDone={() => setIsAdding(false)} />}

      <section aria-labelledby="secondary-wallets-title" className="flex flex-col gap-3">
        <h2 id="secondary-wallets-title" className="text-lg font-bold text-foreground">
          Carteira secundária
        </h2>
        {secondary.length === 0 ? (
          <p className="rounded-lg bg-surface-card p-5 text-sm text-text-secondary">
            Você ainda não adicionou uma carteira secundária.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {secondary.map((wallet) => (
              <li key={wallet.id}>
                <WalletCard wallet={wallet} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function WalletCard({ wallet }: { wallet: Wallet }) {
  const { setPrimary, remove } = useWalletMutations()
  const busy = setPrimary.isPending || remove.isPending

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-card p-4">
      <WalletMark provider={wallet.provider} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex items-center gap-2 text-base text-foreground">
          {wallet.label}
          {wallet.isPrimary && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-tiny font-bold text-primary-foreground">Principal</span>
          )}
        </p>
        <p className="truncate text-xs text-text-secondary">
          {walletProviderLabel(wallet.provider)} · Rede {NETWORK_LABELS[wallet.network]} ·{' '}
          <span title={wallet.address}>{wallet.ensName ?? shortHash(wallet.address)}</span>
        </p>
      </div>
      <div className="flex gap-2">
        {!wallet.isPrimary && (
          <Button size="brand-sm" variant="outline" disabled={busy} onClick={() => setPrimary.mutate(wallet.id)}>
            Tornar principal
          </Button>
        )}
        <Button
          size="brand-sm"
          variant="destructive"
          disabled={busy}
          aria-label={`Remover carteira ${wallet.label}`}
          onClick={() =>
            remove.mutate(wallet.id, { onSuccess: () => toast.success(`Carteira ${wallet.label} removida.`) })
          }
        >
          Remover
        </Button>
      </div>
    </article>
  )
}

const EMPTY_FORM = { label: '', network: '', provider: '', address: '', ensName: '' }

function AddWalletForm({ onDone }: { onDone: () => void }) {
  const { create } = useWalletMutations()
  const [values, setValues] = useState(EMPTY_FORM)
  const [isPrimary, setIsPrimary] = useState(false)
  const errors = create.error instanceof ApiError ? (create.error.fields ?? {}) : {}

  function set(key: keyof typeof EMPTY_FORM, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body: CreateWalletRequest = {
      label: values.label,
      network: values.network as Network,
      provider: values.provider as WalletProvider,
      address: values.address,
      ensName: values.ensName.trim() ? `${values.ensName.trim().replace(/\.eth$/, '')}.eth` : undefined,
      isPrimary,
    }
    create.mutate(body, {
      onSuccess: (wallet) => {
        toast.success(`Carteira ${wallet.label} adicionada.`)
        onDone()
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby="add-wallet-title" className="flex flex-col gap-4 rounded-lg bg-surface-card p-6">
      <h2 id="add-wallet-title" className="text-lg font-bold text-foreground">
        Adicionar carteira
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Apelido da carteira"
          required
          value={values.label}
          error={errors.label}
          onChange={(e) => set('label', e.target.value)}
        />
        <SelectField
          label="Rede"
          placeholder="Selecione uma rede"
          value={values.network}
          error={errors.network}
          options={Object.entries(NETWORK_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(value) => set('network', value)}
        />
        <FormField
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          spellCheck={false}
          value={values.address}
          error={errors.address}
          onChange={(e) => set('address', e.target.value)}
        />
        <SelectField
          label="Tipo de carteira"
          placeholder="Selecione uma carteira"
          value={values.provider}
          error={errors.provider}
          options={WALLET_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={(value) => set('provider', value)}
        />
        <FormField
          label="Nome ENS (opcional)"
          suffix=".eth"
          value={values.ensName}
          error={errors.ensName}
          onChange={(e) => set('ensName', e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="size-4 accent-primary" />
        Usar como carteira principal
      </label>
      {create.isError && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" size="brand-lg" disabled={create.isPending}>
          {create.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        <Button type="button" size="brand-lg" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

interface SelectFieldProps {
  label: string
  placeholder: string
  value: string
  error?: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function SelectField({ label, placeholder, value, error, options, onChange }: SelectFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
        <span aria-hidden className="text-text-accent">
          {' '}*
        </span>
      </label>
      <select
        id={id}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-10 rounded-[5px] border border-border bg-surface-card px-3 text-sm text-foreground',
          'focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive',
          !value && 'text-brand-secondary',
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
