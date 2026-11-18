import { memo } from 'react'
import { responsiveImage } from '@/lib/images'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { MD_UP, useMediaQuery } from '@/lib/useMediaQuery'
import { formatEth } from '@/lib/format'
import cartIcon from '@/assets/icons/cart-small.svg'
import heartIcon from '@/assets/icons/heart.svg'
import zoomIcon from '@/assets/icons/zoom.svg'
import heartBadgeIcon from '@/assets/icons/heart-badge.svg'
import type { Nft } from '@/types/catalog'

interface NftCardProps {
  nft: Nft
  isFavorite?: boolean
  onAddToCart?: (nft: Nft) => void
  onToggleFavorite?: (nft: Nft) => void
}

const actionClass =
  'grid size-[35px] place-items-center rounded-[4px] border border-border bg-[#2f1d15] transition-colors hover:border-border-soft hover:bg-surface-dark'

/** Memoized: catalog data arriving elsewhere on the page does not re-render every card */
export const NftCard = memo(function NftCard({ nft, isFavorite = false, onAddToCart, onToggleFavorite }: NftCardProps) {
  const isDesktop = useMediaQuery(MD_UP)

  return (
    <article className="group relative flex flex-col gap-2 md:gap-3">
      {/* Mobile: rounded gradient card from "Mobile / Início"; md+: flat desktop card */}
      <div className="relative rounded-[20px] bg-[linear-gradient(140deg,#241612_12%,#2f1d15_107%)] px-1 pt-3 pb-5 md:rounded-none md:bg-none md:bg-surface-card md:py-6">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="block rounded-[15px]"
          aria-label={`${nft.name}, ${formatEth(nft.price)}`}
        >
          <img
            {...responsiveImage(nft.imageUrl, '(min-width: 1441px) 21vw, (min-width: 768px) 258px, 50vw')}
            alt=""
            width={250}
            height={250}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-2xl object-cover md:rounded-[15px]"
          />
        </Link>

        {nft.rarity === 'rare' && (
          <span className="pointer-events-none absolute top-4 left-0 flex h-8 w-[68px] items-center bg-primary pl-2 text-caption leading-4 font-medium text-primary-foreground md:top-3.5 md:h-[29px] md:w-20 md:pl-[15px]">
            RARO
          </span>
        )}

        {isDesktop ? (
          // Hover actions from the design; always visible on touch screens
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
        ) : (
          // Mobile: favorite badge on the artwork
          <button
            type="button"
            onClick={() => onToggleFavorite?.(nft)}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            aria-pressed={isFavorite}
            className="absolute top-5 right-3 rounded-full"
          >
            <img
              src={heartBadgeIcon}
              alt=""
              width={28}
              height={28}
              className={cn('transition-opacity', !isFavorite && 'opacity-70')}
            />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 pl-2 leading-4 md:gap-1.5 md:pl-0">
        <h3 className="text-[15px] leading-normal text-foreground md:text-base md:leading-4">{nft.name}</h3>
        <p className="flex flex-wrap items-center gap-x-3 text-base font-bold md:text-lg md:font-normal">
          <span className="font-bold text-text-accent">{formatEth(nft.price)}</span>
          {nft.previousPrice !== undefined && (
            <span className="font-normal text-brand-secondary line-through decoration-1">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPrice)}
            </span>
          )}
        </p>
      </div>
    </article>
  )
})

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="rounded-[20px] bg-surface-card px-1 pt-3 pb-5 md:rounded-none md:py-6">
        <div className="skeleton-shimmer aspect-square w-full rounded-2xl md:rounded-[15px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
      </div>
    </div>
  )
}
