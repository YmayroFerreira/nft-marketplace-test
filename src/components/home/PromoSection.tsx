import { PromoCard } from './PromoCard'
import type { Promo } from '@/types/content'

interface PromoSectionProps {
  promos: Promo[]
}

export function PromoSection({ promos }: PromoSectionProps) {
  return (
    <section aria-label="Destaques" className="container-page mt-24">
      <ul className="grid gap-7 md:grid-cols-2">
        {promos.map((promo) => (
          <li key={promo.id} className="h-full">
            <PromoCard promo={promo} />
          </li>
        ))}
      </ul>
    </section>
  )
}
