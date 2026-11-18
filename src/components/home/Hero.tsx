import { responsiveImage } from '@/lib/images'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MD_UP, useMediaQuery } from '@/lib/useMediaQuery'
import heroDots from '@/assets/decor/hero-dots.svg'
import mobileHeroBg from '@/assets/decor/mobile-hero-bg.svg'
import mobileHeroDots from '@/assets/decor/mobile-hero-dots.svg'
import arrowRightAccent from '@/assets/icons/arrow-right-accent.svg'

interface HeroImage {
  src: string
  alt: string
}

interface HeroProps {
  image: HeroImage
  /** Small overlapping artwork shown only in the mobile banner */
  secondaryImage: HeroImage
  /** id of the section the "Explorar" button scrolls to */
  exploreTargetId: string
}

export function Hero({ image, secondaryImage, exploreTargetId }: HeroProps) {
  const isDesktop = useMediaQuery(MD_UP)
  return (
    <section aria-label="Destaque principal">
      {isDesktop ? (
        <DesktopHero image={image} exploreTargetId={exploreTargetId} />
      ) : (
        <MobileHero image={image} secondaryImage={secondaryImage} exploreTargetId={exploreTargetId} />
      )}
    </section>
  )
}

function DesktopHero({ image, exploreTargetId }: Omit<HeroProps, 'secondaryImage'>) {
  return (
    <div className="container-page mt-8">
      <div className="flex items-center justify-between gap-8 pl-10">
        <div className="flex w-full max-w-[600px] flex-col items-end gap-11">
          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-2 text-foreground">
                <p className="text-sm leading-4 font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
                <h1 className="text-display leading-[70px] font-bold uppercase">
                  Seja dono do futuro <br />
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
          <img src={heroDots} alt="" width={40} height={8} />
        </div>

        <img
          {...responsiveImage(image.src, '450px')}
          alt={image.alt}
          width={450}
          height={450}
          fetchPriority="high"
          decoding="async"
          className="aspect-square w-full max-w-[450px] shrink-0 rounded-3xl object-cover"
        />
      </div>
    </div>
  )
}

/** Compact banner from the "Mobile / Início" frame */
function MobileHero({ image, secondaryImage, exploreTargetId }: HeroProps) {
  return (
    <div className="container-page mt-4">
      <div className="relative overflow-hidden rounded-[30px] p-4">
        <img
          src={mobileHeroBg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="text-xs leading-4 font-medium text-foreground">Bem-vindo à Kurio</p>
              <h1 className="text-lg leading-[29px] font-bold text-foreground uppercase">
                Seja dono da <br />
                cultura digital
              </h1>
              <p className="text-xs leading-[18px] text-text-secondary">
                Descubra NFTs selecionados de criadores do mundo todo.
              </p>
              <a
                href={`#${exploreTargetId}`}
                className="mt-1 flex w-fit items-center gap-2 text-xs leading-[14px] font-bold text-text-accent"
              >
                EXPLORAR
                <img src={arrowRightAccent} alt="" width={10} height={12} className="-rotate-90" />
              </a>
            </div>
            <div className="relative shrink-0">
              <img
                {...responsiveImage(image.src, '138px')}
                alt={image.alt}
                width={138}
                height={138}
                fetchPriority="high"
                decoding="async"
                className="size-[138px] rounded-2xl object-cover"
              />
              <img
                {...responsiveImage(secondaryImage.src, '58px')}
                alt={secondaryImage.alt}
                width={58}
                height={58}
                loading="lazy"
                decoding="async"
                className="absolute top-[88px] left-3.5 size-[58px] rounded-2xl object-cover"
              />
            </div>
          </div>
          <img src={mobileHeroDots} alt="" width={33} height={7} />
        </div>
      </div>
    </div>
  )
}
