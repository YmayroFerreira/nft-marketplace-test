import { usePageMeta } from '@/lib/usePageMeta'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { FormField } from '@/components/account/FormField'
import { WalletMark } from '@/components/account/WalletMark'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { PageTitleBar } from '@/components/layout/MobilePageHeader'
import { ErrorState } from '@/components/common/ErrorState'
import { Button, buttonVariants } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { checkoutApi } from '@/api/endpoints'
import { useCreateOrder, useProfile, useWallets } from '@/features/account/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { clearCheckoutDraft, loadCheckoutDraft, saveCheckoutDraft } from '@/features/checkout/checkout-draft'
import { useCart } from '@/features/cart/useCart'
import { compareEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { formatEth, shortHash } from '@/lib/format'
import { NETWORK_LABELS } from '@/lib/wallets'
import type { Cart, CheckoutQuote, CollectorDetails, Profile, Wallet, WalletConnection } from '@/types/account'
import type { Network } from '@/types/catalog'

export const Route = createFileRoute('/pagamento')({
  component: CheckoutPage,
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+()\s-]{8,20}$/
const NETWORKS = Object.keys(NETWORK_LABELS) as Network[]

function CheckoutPage() {
  usePageMeta('Pagamento', 'Escolha sua carteira e rede, revise o pedido e confirme a compra.')
  return (
    <div className="container-page mt-4 flex flex-col gap-6 md:mt-8">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Carrinho', to: '/carrinho' }, { label: 'Pagamento' }]} />
      </div>
      <PageTitleBar title="Pagamento com carteira" fallback="/carrinho" visibleOnDesktop />
      <RequireAuth message="Entre para escolher sua carteira e confirmar a compra.">
        <CheckoutContent />
      </RequireAuth>
    </div>
  )
}

function CheckoutContent() {
  const cart = useCart()
  const wallets = useWallets()
  const profile = useProfile()
  // Cart of a purchase being sent. If the order went through but its response was
  // lost, the real cart empties; the page stays so a retry can recover the order.
  const [attemptCart, setAttemptCart] = useState<Cart | null>(null)

  if (cart.isPending || wallets.isPending || profile.isPending) {
    return <div className="skeleton-shimmer h-96 rounded-lg" aria-busy aria-label="Carregando pagamento" />
  }
  if (cart.isError) return <ErrorState message={cart.error.message} onRetry={() => void cart.refetch()} />
  if (wallets.isError) return <ErrorState message={wallets.error.message} onRetry={() => void wallets.refetch()} />
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />

  if (cart.data.items.length === 0 && !attemptCart) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-16 text-center">
        <p className="text-lg text-foreground">Não há itens para pagar.</p>
        <Link to="/" className={buttonVariants({ size: 'brand-lg' })}>
          Explorar NFTs
        </Link>
      </div>
    )
  }

  return (
    <CheckoutFlow
      cart={attemptCart ?? cart.data}
      wallets={wallets.data}
      profile={profile.data}
      onAttemptChange={setAttemptCart}
    />
  )
}

type FieldErrors = Partial<Record<'fullName' | 'email' | 'phone' | 'wallet', string>>

function validateCollector(values: CollectorDetails): FieldErrors {
  const errors: FieldErrors = {}
  const fullName = values.fullName.trim()
  if (fullName.length < 3 || !fullName.includes(' ')) errors.fullName = 'Informe nome e sobrenome.'
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (values.phone?.trim() && !PHONE_PATTERN.test(values.phone.trim())) errors.phone = 'Informe um telefone válido.'
  return errors
}

/** Maps API field names ("collector.email") to the form fields */
function apiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || !error.fields) return {}
  return Object.fromEntries(
    Object.entries(error.fields).map(([key, message]) => [key.replace('collector.', '').replace('walletId', 'wallet'), message]),
  )
}

interface CheckoutFlowProps {
  cart: Cart
  wallets: Wallet[]
  profile: Profile
  onAttemptChange: (cart: Cart | null) => void
}

function CheckoutFlow({ cart, wallets, profile, onAttemptChange }: CheckoutFlowProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createOrder = useCreateOrder()
  const primary = wallets.find((w) => w.isPrimary) ?? wallets[0]
  // Data filled before a session expiry (same user only)
  const [draft] = useState(() => (user ? loadCheckoutDraft(user.id) : null))
  const draftWallet = wallets.find((w) => w.id === draft?.walletId)

  const [step, setStep] = useState<'details' | 'review'>('details')
  const [collector, setCollector] = useState<CollectorDetails>(
    () =>
      draft?.collector ?? {
        // Pre-filled from the profile; the user can change it for this order
        fullName: profile.displayName.includes(' ') ? profile.displayName : '',
        email: profile.email,
        phone: '',
      },
  )
  const [walletId, setWalletId] = useState((draftWallet ?? primary)?.id)
  const [network, setNetwork] = useState<Network>(draft?.network ?? draftWallet?.network ?? primary?.network ?? 'ethereum')

  // Keep what the user typed, so a session expiry does not lose it
  useEffect(() => {
    if (user) saveCheckoutDraft({ userId: user.id, collector, walletId, network })
  }, [user, collector, walletId, network])
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  /** Set when the API answered quote_changed: shows old vs new total */
  const [previousTotal, setPreviousTotal] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(
    draft ? 'Recuperamos os dados que você tinha preenchido. Conecte a carteira e revise o pedido para continuar.' : null,
  )
  // One key per purchase attempt: double clicks and retries after a timeout
  // reuse it, so the server never creates two orders for the same attempt
  const idempotencyKey = useRef(crypto.randomUUID())

  const wallet = wallets.find((w) => w.id === walletId)

  const connect = useMutation({
    mutationFn: () => checkoutApi.connectWallet(walletId!, network),
    onMutate: () => setNotice(null),
    onSuccess: (newConnection) => {
      setConnection(newConnection)
      setErrors((e) => ({ ...e, wallet: undefined }))
    },
  })

  function disconnect() {
    if (connection) void checkoutApi.disconnectWallet(connection.id).catch(() => {})
    setConnection(null)
    connect.reset()
  }

  const requestQuote = useMutation({
    mutationFn: checkoutApi.quote,
    onSuccess: (newQuote) => {
      setQuote(newQuote)
      setPreviousTotal(null)
      setStep('review')
    },
  })

  function changeWallet(id: string) {
    disconnect()
    setWalletId(id)
    const selected = wallets.find((w) => w.id === id)
    if (selected) setNetwork(selected.network)
  }

  function changeNetwork(next: Network) {
    // A connection is made for one network: switching networks requires reconnecting
    disconnect()
    setNetwork(next)
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const nextErrors = validateCollector(collector)
    if (!wallet) nextErrors.wallet = 'Selecione uma carteira.'
    else if (!connection) nextErrors.wallet = 'Conecte a carteira para continuar.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    requestQuote.mutate()
  }

  function confirm() {
    if (!quote || !connection || !wallet || createOrder.isPending) return
    setNotice(null)
    onAttemptChange(cart)
    createOrder.mutate(
      {
        body: {
          quoteId: quote.id,
          walletId: wallet.id,
          connectionId: connection.id,
          network,
          collector: {
            fullName: collector.fullName.trim(),
            email: collector.email.trim(),
            ...(collector.phone?.trim() ? { phone: collector.phone.trim() } : {}),
          },
        },
        idempotencyKey: idempotencyKey.current,
      },
      {
        onSuccess: (order) => {
          clearCheckoutDraft()
          void navigate({ to: '/pedido/$orderId', params: { orderId: order.id } })
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) return
          // A final answer from the server ends this attempt; network errors keep the key
          if (!error.isRetryable) {
            idempotencyKey.current = crypto.randomUUID()
            onAttemptChange(null)
          }

          if (error.code === 'quote_changed') {
            const body = error.body as { quote?: CheckoutQuote } | undefined
            if (body?.quote) {
              setPreviousTotal(quote.total)
              setQuote(body.quote)
            }
          } else if (error.code === 'wallet_disconnected') {
            setConnection(null)
            setStep('details')
            setNotice(error.message)
          } else if (error.code === 'validation_error') {
            setErrors(apiFieldErrors(error))
            setStep('details')
          } else if (error.code === 'order_in_progress') {
            const body = error.body as { orderId?: string } | undefined
            if (body?.orderId) void navigate({ to: '/pedido/$orderId', params: { orderId: body.orderId } })
          }
        },
      },
    )
  }

  const confirmError =
    createOrder.error instanceof ApiError &&
    !['quote_changed', 'wallet_disconnected', 'validation_error', 'order_in_progress'].includes(createOrder.error.code)
      ? createOrder.error
      : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <ol aria-label="Etapas do pagamento" className="flex gap-6 text-sm">
          {[
            { id: 'details', label: '1. Dados e carteira' },
            { id: 'review', label: '2. Revisão' },
          ].map((s) => (
            <li
              key={s.id}
              aria-current={step === s.id ? 'step' : undefined}
              className={cn(
                'border-b-2 pb-1',
                step === s.id ? 'border-text-accent font-bold text-text-accent' : 'border-transparent text-text-secondary',
              )}
            >
              {s.label}
            </li>
          ))}
        </ol>

        {notice && (
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
            {notice}
          </p>
        )}

        {step === 'details' ? (
          <form noValidate onSubmit={review} className="flex flex-col gap-6">
            <section aria-labelledby="collector-title" className="flex flex-col gap-4 rounded-2xl bg-surface-card p-5">
              <h2 id="collector-title" className="text-lg font-bold text-foreground">
                Dados do colecionador
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Nome completo"
                  required
                  autoComplete="name"
                  value={collector.fullName}
                  error={errors.fullName}
                  onChange={(e) => setCollector((c) => ({ ...c, fullName: e.target.value }))}
                />
                <FormField
                  label="E-mail para o recibo"
                  required
                  type="email"
                  autoComplete="email"
                  value={collector.email}
                  error={errors.email}
                  onChange={(e) => setCollector((c) => ({ ...c, email: e.target.value }))}
                />
                <FormField
                  label="Telefone (opcional)"
                  type="tel"
                  autoComplete="tel"
                  value={collector.phone}
                  error={errors.phone}
                  onChange={(e) => setCollector((c) => ({ ...c, phone: e.target.value }))}
                />
              </div>
            </section>

            <section aria-labelledby="wallet-title" className="flex flex-col gap-4 rounded-2xl bg-surface-card p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 id="wallet-title" className="text-lg font-bold text-foreground">
                  Carteira e rede
                </h2>
                <Link to="/carteiras" className="text-sm text-text-accent hover:underline">
                  Gerenciar carteiras
                </Link>
              </div>

              {wallets.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-text-secondary">Você ainda não adicionou uma carteira para receber seus NFTs.</p>
                  <Link to="/carteiras" className={buttonVariants({ size: 'brand-md' })}>
                    Adicionar carteira
                  </Link>
                </div>
              ) : (
                <>
                  <fieldset className="flex min-w-0 flex-col gap-3">
                    <legend className="mb-2 text-sm text-foreground">Carteira</legend>
                    {wallets.map((w) => (
                      <label
                        key={w.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring',
                          w.id === walletId ? 'border-primary' : 'border-border hover:border-border-soft',
                        )}
                      >
                        <input
                          type="radio"
                          name="wallet"
                          value={w.id}
                          checked={w.id === walletId}
                          onChange={() => changeWallet(w.id)}
                          className="size-4 accent-primary"
                        />
                        <WalletMark provider={w.provider} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-2 text-base text-foreground">
                            {w.label}
                            {w.isPrimary && (
                              <span className="rounded bg-primary px-1.5 py-0.5 text-tiny font-bold text-primary-foreground">
                                Principal
                              </span>
                            )}
                          </span>
                          <span className="truncate text-xs text-text-secondary">{w.ensName ?? shortHash(w.address)}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="checkout-network" className="text-sm text-foreground">
                      Rede
                    </label>
                    <select
                      id="checkout-network"
                      value={network}
                      onChange={(e) => changeNetwork(e.target.value as Network)}
                      className="h-10 rounded-[5px] border border-border bg-surface-card px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                    >
                      {NETWORKS.map((n) => (
                        <option key={n} value={n}>
                          {NETWORK_LABELS[n]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3" aria-live="polite">
                    {connection ? (
                      <>
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <span aria-hidden className="size-2 rounded-full bg-[#46a358]" />
                          Conectada em {NETWORK_LABELS[connection.network]}
                        </span>
                        <Button type="button" size="brand-sm" variant="outline" onClick={disconnect}>
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="brand-md"
                        onClick={() => connect.mutate()}
                        disabled={!wallet || connect.isPending}
                        aria-invalid={errors.wallet ? true : undefined}
                        aria-describedby={errors.wallet ? 'wallet-error' : undefined}
                      >
                        {connect.isPending ? 'Aguardando a carteira…' : 'Conectar carteira'}
                      </Button>
                    )}
                    {connect.isError && (
                      <span role="alert" className="text-sm text-destructive">
                        {connect.error instanceof ApiError ? connect.error.message : 'Não foi possível conectar.'}
                      </span>
                    )}
                  </div>
                  {errors.wallet && (
                    <p id="wallet-error" className="text-xs text-destructive">
                      {errors.wallet}
                    </p>
                  )}
                </>
              )}
            </section>

            {requestQuote.isError && (
              <p role="alert" className="text-sm text-destructive">
                {requestQuote.error instanceof ApiError ? requestQuote.error.message : 'Não foi possível revisar o pedido.'}{' '}
                <Link to="/carrinho" className="underline">
                  Voltar ao carrinho
                </Link>
              </p>
            )}

            <Button type="submit" size="brand-lg" className="max-md:h-[60px] max-md:w-full max-md:rounded-full max-md:bg-[linear-gradient(97deg,#d28a4c_0%,#b5733f_100%)] max-md:text-lg sm:w-fit" disabled={requestQuote.isPending}>
              {requestQuote.isPending ? 'Calculando…' : 'Revisar pedido'}
            </Button>
          </form>
        ) : (
          quote &&
          wallet && (
            <section aria-labelledby="review-title" className="flex flex-col gap-5 rounded-2xl bg-surface-card p-5">
              <h2 id="review-title" className="text-lg font-bold text-foreground">
                Revise antes de confirmar
              </h2>

              {previousTotal && (
                <p role="alert" className="rounded-md border border-primary bg-primary/10 p-3 text-sm text-foreground">
                  Os valores mudaram desde a revisão: o total foi de {formatEth(previousTotal)} para{' '}
                  <strong>{formatEth(quote.total)}</strong>. Confira os itens e confirme novamente.
                </p>
              )}

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-text-secondary">Colecionador</dt>
                  <dd className="text-foreground">
                    {collector.fullName} · {collector.email}
                    {collector.phone ? ` · ${collector.phone}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Carteira e rede</dt>
                  <dd className="text-foreground">
                    {wallet.label} ({wallet.ensName ?? shortHash(wallet.address)}) · {NETWORK_LABELS[network]}
                  </dd>
                </div>
              </dl>

              <QuoteItems quote={quote} />

              {confirmError && (
                <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
                  {confirmError.message}
                  {confirmError.isRetryable && ' Você pode tentar de novo sem risco de cobrança duplicada.'}
                  {(confirmError.code === 'insufficient_editions' || confirmError.code === 'cart_empty') && (
                    <>
                      {' '}
                      <Link to="/carrinho" className="underline">
                        Ajustar carrinho
                      </Link>
                    </>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button size="brand-lg" className="max-md:h-[60px] max-md:w-full max-md:rounded-full max-md:bg-[linear-gradient(97deg,#d28a4c_0%,#b5733f_100%)] max-md:text-lg" onClick={confirm} disabled={createOrder.isPending}>
                  {createOrder.isPending
                    ? 'Confirmando…'
                    : previousTotal
                      ? 'Confirmar com os novos valores'
                      : 'Confirmar compra'}
                </Button>
                <Button
                  size="brand-lg"
                  variant="ghost"
                  onClick={() => {
                    setStep('details')
                    setQuote(null)
                    setPreviousTotal(null)
                  }}
                  disabled={createOrder.isPending}
                >
                  Editar dados
                </Button>
              </div>
            </section>
          )
        )}
      </div>

      <OrderSummary cart={cart} quote={step === 'review' ? quote : null} />
    </div>
  )
}

function QuoteItems({ quote }: { quote: CheckoutQuote }) {
  return (
    <ul className="flex flex-col gap-3 border-t border-border pt-4">
      {quote.items.map((item) => (
        <li key={`${item.nftId}:${item.editionId}`} className="flex items-center gap-3 text-sm">
          <img src={item.imageUrl} alt="" width={44} height={44} className="size-11 rounded-md object-cover" />
          <span className="min-w-0 flex-1 text-foreground">
            {item.name}{' '}
            <span className="text-text-secondary">
              · {item.editionLabel} · {formatEth(item.unitPrice)} (x {item.quantity})
            </span>
          </span>
          <span className="text-foreground">{formatEth(item.lineTotal)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Cart values while filling the form; the frozen quote at the review step */
function OrderSummary({ cart, quote }: { cart: Cart; quote: CheckoutQuote | null }) {
  const values = quote ?? cart
  return (
    <aside aria-labelledby="order-summary-title" className="flex h-fit flex-col gap-4 rounded-2xl bg-surface-card p-6">
      <h2 id="order-summary-title" className="text-lg font-bold text-foreground">
        {quote ? 'Valores da cotação' : 'Resumo do pedido'}
      </h2>
      {!quote && (
        <ul className="flex flex-col gap-3 max-md:hidden">
          {cart.items.map((item) => (
            <li key={`${item.nftId}:${item.editionId}`} className="flex items-center gap-3 text-sm">
              <img src={item.imageUrl} alt="" width={44} height={44} className="size-11 rounded-md object-cover" />
              <span className="min-w-0 flex-1 text-foreground">
                {item.name} <span className="text-text-secondary">· {item.editionLabel} (x {item.quantity})</span>
              </span>
              <span className="text-foreground">{formatEth(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-foreground">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatEth(values.subtotal)}</dd>
        </div>
        {compareEth(values.discount, '0') > 0 && (
          <div className="flex justify-between">
            <dt>Desconto</dt>
            <dd>(-) {formatEth(values.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Taxa de rede</dt>
          <dd>{formatEth(values.networkFee)}</dd>
        </div>
        <div className="flex justify-between text-base font-bold">
          <dt>Total:</dt>
          <dd className="text-text-accent">{formatEth(values.total)}</dd>
        </div>
      </dl>
      <p className="text-xs text-text-secondary">
        {quote
          ? 'Estes valores ficam garantidos até a confirmação. Se mudarem, você verá os novos valores antes de pagar.'
          : 'Os valores finais são confirmados na revisão.'}
      </p>
    </aside>
  )
}
