import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { formatEth } from '@/lib/format'
import cartIcon from '@/assets/icons/cart-small.svg'
import heartIcon from '@/assets/icons/heart.svg'
import zoomIcon from '@/assets/icons/zoom.svg'
import type { Nft } from '@/types/catalog'

interface NftCardProps {
  nft: Nft
  isFavorite?: boolean
  onAddToCart?: (nft: Nft) => void
  onToggleFavorite?: (nft: Nft) => void
}

const actionClass =
  'grid size-[35px] place-items-center rounded-[4px] border border-border bg-[#2f1d15] transition-colors hover:border-border-soft hover:bg-surface-dark'

export function NftCard({ nft, isFavorite = false, onAddToCart, onToggleFavorite }: NftCardProps) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative bg-surface-card px-1 py-6">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="block rounded-[15px]"
          aria-label={`${nft.name}, ${formatEth(nft.price)}`}
        >
          <img
            src={nft.imageUrl}
            alt=""
            width={250}
            height={250}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-[15px] object-cover"
          />
        </Link>

        {nft.rarity === 'rare' && (
          <span className="pointer-events-none absolute top-3.5 left-0 flex h-[29px] w-20 items-center bg-primary pl-[15px] text-caption leading-4 font-medium text-primary-foreground">
            RARO
          </span>
        )}

        {/* Hover actions from the design; always visible on touch screens */}
        <div
          className={cn(
            'absolute bottom-[7px] left-1/2 flex -translate-x-1/2 gap-2.5 transition-opacity',
            'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
            'motion-reduce:transition-none',
          )}
        >
          <button
            type="button"
            onClick={() => onAddToCart?.(nft)}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            className={actionClass}
          >
            <img src={cartIcon} alt="" width={20} height={20} />
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite?.(nft)}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            aria-pressed={isFavorite}
            className={cn(actionClass, isFavorite && 'border-primary bg-primary/30')}
          >
            <img src={heartIcon} alt="" width={20} height={20} />
          </button>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver detalhes de ${nft.name}`}
            className={actionClass}
          >
            <img src={zoomIcon} alt="" width={20} height={20} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 leading-4">
        <h3 className="text-base text-foreground">{nft.name}</h3>
        <p className="flex items-center gap-3 text-lg">
          <span className="font-bold text-text-accent">{formatEth(nft.price)}</span>
          {nft.previousPrice !== undefined && (
            <span className="text-brand-secondary line-through decoration-1">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPrice)}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="bg-surface-card px-1 py-6">
        <div className="skeleton-shimmer aspect-square w-full rounded-[15px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
      </div>
    </div>
  )
}
