import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import heroDots from '@/assets/decor/hero-dots.svg'

interface HeroProps {
  imageUrl: string
  imageAlt: string
  /** id of the section the "Explorar" button scrolls to */
  exploreTargetId: string
}

export function Hero({ imageUrl, imageAlt, exploreTargetId }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="container-page mt-8">
      <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:justify-between md:gap-8 md:pl-10">
        <div className="flex w-full max-w-[600px] flex-col gap-11 md:items-end">
          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-2 text-foreground">
                <p className="text-sm leading-4 font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
                <h1
                  id="hero-title"
                  className="text-[28px] leading-[44px] font-bold uppercase sm:text-display sm:leading-[70px]"
                >
                  Seja dono do futuro <br className="hidden sm:inline" />
                  da arte digital
                </h1>
              </div>
              <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
                digital rara, apoie artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <a
              href={`#${exploreTargetId}`}
              className={cn(buttonVariants({ size: 'brand-lg' }), 'w-[140px] uppercase')}
            >
              Explorar
            </a>
          </div>
          {/* Carousel indicator from the design; the hero has a single slide for now */}
          <img src={heroDots} alt="" width={40} height={8} className="hidden md:block" />
        </div>

        <img
          src={imageUrl}
          alt={imageAlt}
          width={450}
          height={450}
          fetchPriority="high"
          decoding="async"
          className="aspect-square w-full max-w-[450px] shrink-0 rounded-3xl object-cover"
        />
      </div>
    </section>
  )
}
