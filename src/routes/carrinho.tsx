import { usePageMeta } from '@/lib/usePageMeta'
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
import type { Cart, CartItem } from '@/types/account'
import { PageTitleBar } from '@/components/layout/MobilePageHeader'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  usePageMeta('Carrinho', 'Revise os NFTs do seu carrinho, aplique cupons e finalize a compra.')
  return (
    <div className="container-page mt-4 flex flex-col gap-6 md:mt-8">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }, { label: 'Carrinho' }]} />
      </div>
      <PageTitleBar title="Carrinho de NFTs" fallback="/" />
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

  function changeQuantity(item: CartItem, quantity: number) {
    setItem.mutate({
      nftId: item.nftId,
      editionId: item.editionId,
      quantity,
      // Detects changes made in another tab (signed-in cart only)
      expectedVersion: isGuest ? undefined : cart.version,
    })
  }

  function remove(item: CartItem) {
    removeItem.mutate({ nftId: item.nftId, editionId: item.editionId })
  }

  return (
    <section aria-label="Itens do carrinho" className="min-w-0">
      {/* Mobile frame: one card per item */}
      <ul aria-busy={isUpdating} className="flex flex-col gap-4 md:hidden">
        {cart.items.map((item) => (
          <li key={`${item.nftId}:${item.editionId}`} className="relative flex overflow-hidden rounded-2xl bg-surface-card">
            <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="shrink-0" aria-label={item.name}>
              <img src={item.imageUrl} alt="" width={100} height={100} loading="lazy" className="size-[100px] rounded-2xl object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pr-3 pl-3">
              <p className="pr-7 text-[15px] leading-5 font-bold text-foreground">{item.name}</p>
              <p className="text-sm text-text-secondary">Edição: {item.editionLabel}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-bold text-text-accent">{formatEthTotal(item.lineTotal)}</p>
                <QuantityStepper
                  size="sm"
                  label={`Edições de ${item.name} (${item.editionLabel})`}
                  value={item.quantity}
                  max={item.available}
                  disabled={isUpdating}
                  onChange={(quantity) => changeQuantity(item, quantity)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(item)}
              disabled={isUpdating}
              aria-label={`Remover ${item.name} (${item.editionLabel}) do carrinho`}
              className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full text-text-secondary hover:text-destructive disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">NFTs no carrinho</caption>
        <thead className="border-b border-border text-sm text-foreground">
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
            <tr key={`${item.nftId}:${item.editionId}`} className="border-b border-border">
              <td className="py-4">
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
              <td className="py-4 text-sm text-foreground">{formatEth(item.unitPrice)}</td>
              <td className="py-4">
                <QuantityStepper
                  size="sm"
                  label={`Edições de ${item.name} (${item.editionLabel})`}
                  value={item.quantity}
                  max={item.available}
                  disabled={isUpdating}
                  onChange={(quantity) => changeQuantity(item, quantity)}
                />
              </td>
              <td className="py-4 text-base font-bold text-text-accent">
                {formatEthTotal(item.lineTotal)}
              </td>
              <td className="py-4 text-right">
                <button
                  type="button"
                  onClick={() => remove(item)}
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
    <aside
      aria-labelledby="summary-title"
      className="flex h-fit flex-col gap-5 rounded-lg bg-surface-card p-6 max-md:-mx-4 max-md:rounded-t-[32px] max-md:rounded-b-none max-md:px-6 max-md:pt-6"
    >
      <h2 id="summary-title" className="text-lg font-bold text-foreground max-md:sr-only">
        Resumo da carteira
      </h2>

      <form onSubmit={handlePromo} className="flex flex-col gap-2">
        <label htmlFor="promo-code" className="text-sm text-foreground max-md:sr-only">
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
          <div className="flex h-10 overflow-hidden rounded-md border border-border-soft max-md:h-12 max-md:rounded-full">
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
            <button
              type="submit"
              disabled={applyPromo.isPending}
              className="bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60 max-md:rounded-full max-md:bg-[linear-gradient(97deg,#d28a4c_0%,#b5733f_100%)] max-md:px-6 max-md:text-base"
            >
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
        <div className="flex flex-col items-end gap-0.5">
          <div className="w-full">
            <SummaryRow label="Taxa de rede" value={formatEthTotal(cart.networkFee)} />
          </div>
          <span className="text-xs text-text-accent">Taxa estimada</span>
        </div>
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
        <Button
          size="brand-lg"
          className="w-full max-md:h-[60px] max-md:rounded-full max-md:bg-[linear-gradient(97deg,#d28a4c_0%,#b5733f_100%)] max-md:text-lg"
          onClick={checkout}
          disabled={hasUnavailable}
        >
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

