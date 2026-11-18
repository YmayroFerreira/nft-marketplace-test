import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ErrorState } from '@/components/common/ErrorState'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { NftCard } from '@/components/nft/NftCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { useAuth } from '@/features/auth/auth-context'
import { useCart, useCartActions } from '@/features/cart/useCart'
import { catalogQueries } from '@/features/catalog/queries'
import { useNftCardActions } from '@/features/catalog/useNftCardActions'
import { cn } from '@/lib/utils'
import { formatEth, formatEthTotal } from '@/lib/format'
import type { Cart } from '@/types/account'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  return (
    <div className="container-page mt-6 flex flex-col gap-6 md:mt-8">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }, { label: 'Carrinho' }]} />
      <h1 className="sr-only">Carrinho</h1>
      {/* Visitors have a cart too; it is merged into the account on sign-in */}
      <CartContent />
    </div>
  )
}

function CartContent() {
  const cart = useCart()

  if (cart.isPending) return <CartSkeleton />
  if (cart.isError) return <ErrorState message={cart.error.message} onRetry={() => void cart.refetch()} />

  if (cart.data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-16 text-center">
        <p className="text-lg text-foreground">Seu carrinho está vazio.</p>
        <Link to="/" className={buttonVariants({ size: 'brand-lg' })}>
          Explorar NFTs
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <CartItems cart={cart.data} />
        <CartSummary cart={cart.data} />
      </div>
      <Suggestions excludeIds={cart.data.items.map((item) => item.nftId)} />
    </>
  )
}

function CartItems({ cart }: { cart: Cart }) {
  const { setItem, removeItem, isGuest } = useCartActions()
  const isUpdating = setItem.isPending || removeItem.isPending

  return (
    <section aria-label="Itens do carrinho" className="min-w-0">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">NFTs no carrinho</caption>
        <thead className="hidden border-b border-border text-sm text-foreground md:table-header-group">
          <tr>
            <th scope="col" className="pb-3 font-bold">NFTs</th>
            <th scope="col" className="pb-3 font-bold">Preço</th>
            <th scope="col" className="pb-3 font-bold">Edições</th>
            <th scope="col" className="pb-3 font-bold">Total</th>
            <th scope="col" className="pb-3">
              <span className="sr-only">Remover</span>
            </th>
          </tr>
        </thead>
        <tbody aria-busy={isUpdating}>
          {cart.items.map((item) => (
            <tr
              key={`${item.nftId}:${item.editionId}`}
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-4 md:table-row md:py-0"
            >
              <td className="col-span-2 md:py-4">
                <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="flex items-center gap-4">
                  <img src={item.imageUrl} alt="" width={70} height={70} loading="lazy" className="size-[70px] rounded-lg object-cover" />
                  <span className="flex flex-col gap-1">
                    <span className="text-base text-foreground">{item.name}</span>
                    <span className="text-xs text-text-secondary">
                      ID do token: {item.tokenId} · Edição {item.editionLabel}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="text-sm text-foreground md:py-4">
                <span className="text-text-secondary md:hidden">Preço: </span>
                {formatEth(item.unitPrice)}
              </td>
              <td className="row-start-3 md:py-4">
                <QuantityStepper
                  size="sm"
                  label={`Edições de ${item.name} (${item.editionLabel})`}
                  value={item.quantity}
                  max={item.available}
                  disabled={isUpdating}
                  onChange={(quantity) =>
                    setItem.mutate({
                      nftId: item.nftId,
                      editionId: item.editionId,
                      quantity,
                      // Detects changes made in another tab (signed-in cart only)
                      expectedVersion: isGuest ? undefined : cart.version,
                    })
                  }
                />
              </td>
              <td className="text-right text-base font-bold text-text-accent md:py-4 md:text-left">
                {formatEthTotal(item.lineTotal)}
              </td>
              <td className="row-start-3 text-right md:py-4">
                <button
                  type="button"
                  onClick={() => removeItem.mutate({ nftId: item.nftId, editionId: item.editionId })}
                  disabled={isUpdating}
                  aria-label={`Remover ${item.name} (${item.editionLabel}) do carrinho`}
                  className="grid size-9 place-items-center rounded-md text-text-secondary hover:bg-accent hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function CartSummary({ cart }: { cart: Cart }) {
  const [code, setCode] = useState('')
  const { applyPromo, removePromo } = useCartActions()
  const { user, requireAuth } = useAuth()
  const navigate = useNavigate()
  const promoError = applyPromo.error instanceof ApiError ? applyPromo.error.fields?.code : undefined
  const hasUnavailable = cart.items.some((item) => item.quantity > item.available)

  function handlePromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.trim()) applyPromo.mutate(code.trim(), { onSuccess: () => setCode('') })
  }

  /** Checkout needs an account: visitors sign in first and the cart is merged */
  function checkout() {
    requireAuth(() => void navigate({ to: '/pagamento' }))
  }

  return (
    <aside aria-labelledby="summary-title" className="flex h-fit flex-col gap-5 rounded-lg bg-surface-card p-6">
      <h2 id="summary-title" className="text-lg font-bold text-foreground">
        Resumo da carteira
      </h2>

      <form onSubmit={handlePromo} className="flex flex-col gap-2">
        <label htmlFor="promo-code" className="text-sm text-foreground">
          Código promocional
        </label>
        {cart.promoCode ? (
          <p className="flex items-center justify-between rounded-md border border-border-soft px-3 py-2 text-sm text-text-accent">
            {cart.promoCode}
            <button type="button" onClick={() => removePromo.mutate()} className="text-xs text-foreground underline">
              Remover
            </button>
          </p>
        ) : (
          <div className="flex h-10 overflow-hidden rounded-md border border-border-soft">
            <input
              id="promo-code"
              value={code}
              aria-invalid={promoError ? true : undefined}
              aria-describedby={promoError ? 'promo-code-error' : undefined}
              onChange={(e) => {
                setCode(e.target.value)
                applyPromo.reset()
              }}
              placeholder="Digite o código promocional..."
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-brand-secondary focus-visible:-outline-offset-2"
            />
            <button type="submit" disabled={applyPromo.isPending} className="bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
              Aplicar
            </button>
          </div>
        )}
        {promoError && (
          <p id="promo-code-error" className="text-xs text-destructive">
            {promoError}
          </p>
        )}
      </form>

      <dl className="flex flex-col gap-3 text-sm text-foreground">
        <SummaryRow label="Subtotal" value={formatEthTotal(cart.subtotal)} />
        <SummaryRow label="Desconto do lançamento" value={`(-) ${formatEthTotal(cart.discount)}`} />
        <SummaryRow label="Taxa de rede" value={formatEthTotal(cart.networkFee)} />
        <div className="border-t border-border pt-3">
          <SummaryRow label="Total estimado" value={formatEthTotal(cart.total)} emphasis />
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        {hasUnavailable && (
          <p role="alert" className="text-xs text-destructive">
            Algum item tem mais cópias do que o estoque atual. Ajuste as quantidades para continuar.
          </p>
        )}
        <Button size="brand-lg" className="w-full" onClick={checkout} disabled={hasUnavailable}>
          {user ? 'Conectar e finalizar' : 'Entrar e finalizar'}
        </Button>
        <Link to="/" className="text-center text-sm text-text-accent hover:underline">
          Continuar explorando
        </Link>
      </div>
    </aside>
  )
}

/** Shimmer placeholders for the cart items and the summary (required by the challenge) */
function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]" aria-busy aria-label="Carregando carrinho">
      <div className="flex flex-col">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border py-4" aria-hidden>
            <div className="skeleton-shimmer size-[70px] shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="skeleton-shimmer h-4 w-1/2 rounded" />
              <div className="skeleton-shimmer h-3 w-1/4 rounded" />
            </div>
            <div className="skeleton-shimmer hidden h-6 w-24 rounded md:block" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-lg bg-surface-card p-6" aria-hidden>
        <div className="skeleton-shimmer h-5 w-2/3 rounded" />
        <div className="skeleton-shimmer h-10 rounded" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex justify-between">
            <div className="skeleton-shimmer h-4 w-1/3 rounded" />
            <div className="skeleton-shimmer h-4 w-1/4 rounded" />
          </div>
        ))}
        <div className="skeleton-shimmer h-10 rounded" />
      </div>
    </div>
  )
}

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={cn(emphasis && 'font-bold')}>{label}</dt>
      <dd className={cn(emphasis ? 'text-base font-bold text-text-accent' : 'text-foreground')}>{value}</dd>
    </div>
  )
}

function Suggestions({ excludeIds }: { excludeIds: string[] }) {
  const catalog = useQuery(catalogQueries.list({ pageSize: 9, tab: 'trending' }))
  const actions = useNftCardActions()
  const items = (catalog.data?.items ?? []).filter((nft) => !excludeIds.includes(nft.id)).slice(0, 3)
  if (items.length === 0) return null

  return (
    <section aria-labelledby="suggestions-title" className="mt-10 flex flex-col gap-6">
      <h2 id="suggestions-title" className="border-b border-border pb-2 text-lg font-bold text-text-accent">
        Colecionadores também viram
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((nft) => (
          <li key={nft.id}>
            <NftCard
              nft={nft}
              isFavorite={actions.isFavorite(nft.id)}
              onAddToCart={actions.onAddToCart}
              onToggleFavorite={actions.onToggleFavorite}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

