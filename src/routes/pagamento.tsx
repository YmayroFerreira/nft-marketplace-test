import { useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ErrorState } from '@/components/common/ErrorState'
import { WalletMark } from '@/components/account/WalletMark'
import { Button, buttonVariants } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useCart, useCreateOrder, useWallets } from '@/features/account/hooks'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { cn } from '@/lib/utils'
import { formatEthTotal, shortHash } from '@/lib/format'
import type { Cart, Wallet } from '@/types/account'
import { NETWORK_LABELS as NETWORK_NAMES } from '@/lib/wallets'

export const Route = createFileRoute('/pagamento')({
  component: CheckoutPage,
})


function CheckoutPage() {
  return (
    <div className="container-page mt-6 flex flex-col gap-6 md:mt-8">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Carrinho', to: '/carrinho' }, { label: 'Pagamento' }]} />
      <h1 className="text-2xl font-bold text-foreground">Pagamento com carteira</h1>
      <RequireAuth message="Entre para escolher sua carteira e confirmar a compra.">
        <CheckoutContent />
      </RequireAuth>
    </div>
  )
}

function CheckoutContent() {
  const cart = useCart()
  const wallets = useWallets()

  if (cart.isPending || wallets.isPending) return <div className="skeleton-shimmer h-80 rounded-lg" aria-busy />
  if (cart.isError) return <ErrorState message={cart.error.message} onRetry={() => void cart.refetch()} />
  if (wallets.isError) return <ErrorState message={wallets.error.message} onRetry={() => void wallets.refetch()} />

  if (cart.data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-16 text-center">
        <p className="text-lg text-foreground">Não há itens para pagar.</p>
        <Link to="/" className={buttonVariants({ size: 'brand-lg' })}>
          Explorar NFTs
        </Link>
      </div>
    )
  }

  return <CheckoutForm cart={cart.data} wallets={wallets.data} />
}

function CheckoutForm({ cart, wallets }: { cart: Cart; wallets: Wallet[] }) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const [walletId, setWalletId] = useState(() => (wallets.find((w) => w.isPrimary) ?? wallets[0])?.id)
  // One key per purchase attempt: retries and double clicks reuse it, so the
  // server never creates two orders for the same attempt
  const idempotencyKey = useRef(crypto.randomUUID())

  function confirm() {
    if (!walletId || createOrder.isPending) return
    createOrder.mutate(
      { body: { walletId, cartVersion: cart.version }, idempotencyKey: idempotencyKey.current },
      {
        onSuccess: (order) => void navigate({ to: '/pedido/$orderId', params: { orderId: order.id } }),
        onError: (error) => {
          // A final answer from the server (not a network error) ends this attempt
          if (error instanceof ApiError && !error.isRetryable) idempotencyKey.current = crypto.randomUUID()
        },
      },
    )
  }

  const error = createOrder.error

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-labelledby="wallets-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="wallets-title" className="text-lg font-bold text-foreground">
            Carteira conectada
          </h2>
          <Link to="/carteiras" className="text-sm text-text-accent hover:underline">
            Trocar carteira
          </Link>
        </div>

        {wallets.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-card p-6">
            <p className="text-sm text-text-secondary">Você ainda não adicionou uma carteira para receber seus NFTs.</p>
            <Link to="/carteiras" className={buttonVariants({ size: 'brand-md' })}>
              Adicionar carteira
            </Link>
          </div>
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Escolha a carteira de pagamento</legend>
            {wallets.map((wallet) => (
              <label
                key={wallet.id}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-lg border bg-surface-card p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring',
                  wallet.id === walletId ? 'border-primary' : 'border-border hover:border-border-soft',
                )}
              >
                <input
                  type="radio"
                  name="wallet"
                  value={wallet.id}
                  checked={wallet.id === walletId}
                  onChange={() => setWalletId(wallet.id)}
                  className="size-4 accent-primary"
                />
                <WalletMark provider={wallet.provider} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 text-base text-foreground">
                    {wallet.label}
                    {wallet.isPrimary && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-tiny font-bold text-primary-foreground">
                        Principal
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-text-secondary">
                    {wallet.ensName ?? shortHash(wallet.address)} · Rede {NETWORK_NAMES[wallet.network]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
      </section>

      <aside aria-labelledby="order-summary-title" className="flex h-fit flex-col gap-5 rounded-lg bg-surface-card p-6">
        <h2 id="order-summary-title" className="text-lg font-bold text-foreground">
          Resumo do pedido
        </h2>
        <ul className="flex flex-col gap-3">
          {cart.items.map((item) => (
            <li key={item.nftId} className="flex items-center gap-3 text-sm">
              <img src={item.imageUrl} alt="" width={44} height={44} className="size-11 rounded-md object-cover" />
              <span className="flex-1 text-foreground">
                {item.name} <span className="text-text-secondary">(x {item.quantity})</span>
              </span>
              <span className="text-foreground">{formatEthTotal(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-foreground">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatEthTotal(cart.subtotal)}</dd>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between">
              <dt>Desconto</dt>
              <dd>(-) {formatEthTotal(cart.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd>{formatEthTotal(cart.networkFee)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total:</dt>
            <dd className="text-text-accent">{formatEthTotal(cart.total)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
            {error instanceof ApiError ? error.message : 'Não foi possível confirmar a compra.'}
            {error instanceof ApiError && error.isRetryable && ' Você pode tentar de novo sem risco de cobrança duplicada.'}
          </p>
        )}

        <Button
          size="brand-lg"
          className="w-full"
          onClick={confirm}
          disabled={!walletId || createOrder.isPending}
        >
          {createOrder.isPending ? 'Confirmando…' : 'Confirmar compra'}
        </Button>
      </aside>
    </div>
  )
}
