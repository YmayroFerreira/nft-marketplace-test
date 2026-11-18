import { responsiveImage } from '@/lib/images'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import arrowRightIcon from '@/assets/icons/arrow-right.svg'
import promoLines from '@/assets/decor/promo-lines.svg'
import type { Promo } from '@/types/content'

interface PromoCardProps {
  promo: Promo
}

export function PromoCard({ promo }: PromoCardProps) {
  return (
    <article className="relative flex h-full min-h-[250px] overflow-hidden rounded-lg bg-surface-card">
      <img
        {...responsiveImage(promo.imageUrl, '292px')}
        alt=""
        width={292}
        height={250}
        loading="lazy"
        decoding="async"
        className="w-2/5 max-w-[292px] shrink-0 self-stretch rounded-[18px] object-cover sm:w-1/2"
      />
      {/* Decorative curved lines from the design */}
      <img
        src={promoLines}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="relative flex min-w-0 flex-1 flex-col items-end justify-between gap-4 p-5 text-right sm:py-9 sm:pr-[30px] sm:pl-2">
        <div className="flex flex-col items-end gap-3">
          <h3 className="max-w-[17ch] text-lg leading-6 font-bold text-balance text-foreground lg:max-w-[26ch]">
            {promo.title}
          </h3>
          <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{promo.description}</p>
        </div>
        <a
          href={promo.href}
          className={cn(buttonVariants({ size: 'brand-lg' }), 'w-[140px] px-0 text-sm font-medium')}
        >
          Explorar
          <img src={arrowRightIcon} alt="" width={11} height={13} className="-rotate-90" />
        </a>
      </div>
    </article>
  )
}
