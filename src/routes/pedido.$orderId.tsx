import { createFileRoute, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { buttonVariants } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useOrder } from '@/features/account/hooks'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { cn } from '@/lib/utils'
import { formatDate, formatEthTotal, shortHash } from '@/lib/format'
import { NETWORK_LABELS, walletProviderLabel } from '@/lib/wallets'
import type { Order, OrderStatus } from '@/types/account'

export const Route = createFileRoute('/pedido/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  return (
    <div className="container-page mt-6 flex justify-center md:mt-10">
      <RequireAuth message="Entre para acompanhar o seu pedido.">
        <OrderContent />
      </RequireAuth>
    </div>
  )
}

function OrderContent() {
  const { orderId } = Route.useParams()
  const order = useOrder(orderId)

  if (order.isPending) return <div className="skeleton-shimmer h-[600px] w-full max-w-[578px] rounded-lg" aria-busy />
  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404
    return (
      <div className="w-full max-w-[578px]">
        <ErrorState
          message={notFound ? 'Pedido não encontrado.' : order.error.message}
          onRetry={notFound ? undefined : () => void order.refetch()}
        />
      </div>
    )
  }

  return <OrderCard order={order.data} />
}

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Pedido recebido' },
  { status: 'processing', label: 'Transação em processamento' },
  { status: 'confirmed', label: 'Confirmado na rede' },
]

function OrderCard({ order }: { order: Order }) {
  const isDone = order.status === 'confirmed'
  const isFailed = order.status === 'failed'
  const currentStep = STEPS.findIndex((step) => step.status === order.status)

  const title = isDone
    ? 'Seus NFTs agora estão na sua carteira'
    : isFailed
      ? 'Não foi possível concluir a compra'
      : 'Estamos confirmando sua compra'

  async function copyTransaction() {
    if (!order.transactionHash) return
    try {
      await navigator.clipboard.writeText(order.transactionHash)
      toast.success('ID da transação copiado.')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <article
      aria-labelledby="order-title"
      className="relative w-full max-w-[578px] overflow-hidden rounded-lg bg-surface-card px-6 pt-10 pb-12 sm:px-12"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden
          className={cn(
            'grid size-16 place-items-center rounded-full text-3xl font-bold',
            isFailed ? 'bg-destructive/20 text-destructive' : 'bg-primary text-primary-foreground',
          )}
        >
          {isDone ? '✓' : isFailed ? '!' : '…'}
        </span>
        <h1 id="order-title" className="text-xl font-bold text-foreground">
          {title}
        </h1>
      </div>

      {/* Live progress, updated by `order.updated` events */}
      {!isFailed && (
        <ol aria-label="Andamento do pedido" className="mt-6 flex flex-col gap-2">
          {STEPS.map((step, index) => {
            const reached = index <= currentStep
            return (
              <li key={step.status} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className={cn(
                    'size-3 rounded-full',
                    reached ? 'bg-primary' : 'border border-border-soft',
                    index === currentStep && !isDone && 'animate-pulse motion-reduce:animate-none',
                  )}
                />
                <span className={reached ? 'text-foreground' : 'text-text-secondary'}>
                  {step.label}
                  <span className="sr-only">{reached ? ' (concluído)' : ' (aguardando)'}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
      <p role="status" className="sr-only">
        {title}
      </p>

      {isFailed && (
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-text-secondary">{order.failureReason}</p>
          <p className="text-sm text-text-secondary">Os itens voltaram para o seu carrinho.</p>
          <Link to="/carrinho" className={buttonVariants({ size: 'brand-lg' })}>
            Voltar ao carrinho
          </Link>
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="text-text-secondary">ID da transação</dt>
          <dd className="text-foreground">{order.transactionHash ? shortHash(order.transactionHash) : '—'}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-text-secondary">Data</dt>
          <dd className="text-foreground">{formatDate(order.createdAt)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-text-secondary">Total</dt>
          <dd className="font-bold text-text-accent">{formatEthTotal(order.total)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-text-secondary">Carteira</dt>
          <dd className="text-foreground">
            {walletProviderLabel(order.wallet.provider)} · {NETWORK_LABELS[order.network]}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <dt className="text-text-secondary">Colecionador</dt>
          <dd className="text-foreground">
            {order.collector.fullName} · {order.collector.email}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="order-items-title" className="mt-6 flex flex-col gap-3">
        <h2 id="order-items-title" className="text-base font-bold text-foreground">
          Detalhes da transação
        </h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={`${item.nftId}:${item.editionId}`} className="flex items-center gap-3 text-sm">
              <img src={item.imageUrl} alt="" width={48} height={48} className="size-12 rounded-md object-cover" />
              <span className="flex flex-1 flex-col">
                <span className="text-foreground">{item.name}</span>
                <span className="text-xs text-text-secondary">
                  ID do token: {item.tokenId} · Edição {item.editionLabel}
                </span>
              </span>
              <span className="text-text-secondary">(x {item.quantity})</span>
              <span className="w-24 text-right text-foreground">{formatEthTotal(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-border pt-3 text-sm text-foreground">
          <span>Taxa de rede</span>
          <span>{formatEthTotal(order.networkFee)}</span>
        </div>
      </section>

      {isDone && (
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <p className="text-xs text-text-secondary">
            Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para a sua
            carteira conectada.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {order.transactionHash && (
              <Link
                to="/explorador/tx/$hash"
                params={{ hash: order.transactionHash }}
                className={buttonVariants({ size: 'brand-md', variant: 'outline' })}
              >
                Ver no explorador (simulado)
              </Link>
            )}
            <button type="button" onClick={copyTransaction} className={buttonVariants({ size: 'brand-md', variant: 'outline' })}>
              Copiar ID da transação
            </button>
            <Link to="/" className={buttonVariants({ size: 'brand-md' })}>
              Continuar explorando
            </Link>
          </div>
        </div>
      )}

      <span aria-hidden className="absolute inset-x-0 bottom-0 h-2.5 bg-primary" />
    </article>
  )
}
