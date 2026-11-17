import { Link } from '@tanstack/react-router'
import { formatEth } from '@/lib/format'
import type { Nft } from '@/types/catalog'

interface NftCardProps {
  nft: Nft
}

export function NftCard({ nft }: NftCardProps) {
  return (
    <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="group flex flex-col gap-3">
      <div className="bg-surface-card px-1 py-6">
        <img
          src={nft.imageUrl}
          alt={nft.name}
          width={250}
          height={250}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-[15px] object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
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
    </Link>
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
