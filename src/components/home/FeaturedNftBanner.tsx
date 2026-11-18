import { responsiveImage } from '@/lib/images'
import { Link } from '@tanstack/react-router'
import type { Nft } from '@/types/catalog'

interface FeaturedNftBannerProps {
  nft: Nft
}

export function FeaturedNftBanner({ nft }: FeaturedNftBannerProps) {
  return (
    <section
      aria-labelledby="featured-nft-title"
      className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 px-5">
          <h2 id="featured-nft-title" className="text-2xl leading-8 font-bold text-text-accent">
            NFT EM DESTAQUE
          </h2>
          <p className="text-center text-[22px] leading-4 font-bold text-foreground">
            OFERTA LIMITADA
          </p>
        </div>
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block rounded-[22px]">
          <img
            {...responsiveImage(nft.imageUrl, '310px')}
            alt={nft.name}
            width={310}
            height={368}
            loading="lazy"
            decoding="async"
            className="h-[368px] w-full rounded-[22px] object-cover"
          />
        </Link>
      </div>

      {/* Decorative shapes from the design */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-[linear-gradient(145deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-[linear-gradient(145deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]"
      />
    </section>
  )
}
