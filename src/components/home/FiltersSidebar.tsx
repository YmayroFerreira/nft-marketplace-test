import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { toWei, type EthString } from '@/lib/eth'
import { formatEthRange } from '@/lib/format'
import type { CatalogFacets, Network, PriceRange } from '@/types/catalog'

export interface CatalogFilters {
  collections: string[]
  networks: Network[]
  price?: PriceRange
}

interface FiltersSidebarProps {
  facets: CatalogFacets
  value: CatalogFilters
  onChange: (filters: CatalogFilters) => void
  className?: string
}

/**
 * The slider works in integer hundredths of ETH (0.02 ETH = 2), so no floating
 * point is involved; values are converted back to decimal strings for the API.
 */
const WEI_PER_CENT = 10n ** 16n

function toCents(value: EthString, round: 'down' | 'up') {
  const wei = toWei(value)
  const cents = wei / WEI_PER_CENT
  return Number(round === 'up' && wei % WEI_PER_CENT !== 0n ? cents + 1n : cents)
}

function fromCents(cents: number): EthString {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

export function FiltersSidebar({ facets, value, onChange, className }: FiltersSidebarProps) {
  const bounds = facets.priceRange
  const applied = value.price ?? bounds
  // The slider only changes the query when "Aplicar" is pressed
  const [draftPrice, setDraftPrice] = useState<[number, number]>([
    toCents(applied.min, 'down'),
    toCents(applied.max, 'up'),
  ])

  return (
    <section aria-label="Filtros" className={cn('bg-surface-card p-5', className)}>
      <div className="flex flex-col gap-10">
        <FilterGroup title="Coleções">
          {facets.collections.map((collection) => (
            <FilterOption
              key={collection.id}
              label={collection.name}
              count={collection.count}
              selected={value.collections.includes(collection.id)}
              onToggle={() =>
                onChange({ ...value, collections: toggle(value.collections, collection.id) })
              }
            />
          ))}
        </FilterGroup>

        <div className="flex flex-col gap-3">
          <h3 className="text-lg leading-4 font-bold text-foreground">Faixa de preço</h3>
          <div className="flex flex-col gap-3 pl-3">
            <Slider
              aria-label="Faixa de preço em ETH"
              getThumbLabel={(index) => (index === 0 ? 'Preço mínimo em ETH' : 'Preço máximo em ETH')}
              min={toCents(bounds.min, 'down')}
              max={toCents(bounds.max, 'up')}
              step={1}
              value={draftPrice}
              onValueChange={(next) => setDraftPrice(next as [number, number])}
              className="py-2 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:size-[15px] [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-primary [&_[data-slot=slider-track]]:h-[3px] [&_[data-slot=slider-track]]:bg-primary/60"
            />
            <p className="text-[15px] text-foreground" aria-live="polite">
              Preço: {formatEthRange(fromCents(draftPrice[0]), fromCents(draftPrice[1]))}
            </p>
            <Button
              size="brand-sm"
              className="w-fit"
              onClick={() =>
                onChange({ ...value, price: { min: fromCents(draftPrice[0]), max: fromCents(draftPrice[1]) } })
              }
            >
              Aplicar
            </Button>
          </div>
        </div>

        <FilterGroup title="Rede">
          {facets.networks.map((network) => (
            <FilterOption
              key={network.id}
              label={network.name}
              count={network.count}
              selected={value.networks.includes(network.id)}
              onToggle={() => onChange({ ...value, networks: toggle(value.networks, network.id) })}
            />
          ))}
        </FilterGroup>
      </div>
    </section>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg leading-4 font-bold text-foreground">{title}</h3>
      <ul className="flex flex-col px-3">{children}</ul>
    </div>
  )
}

interface FilterOptionProps {
  label: string
  count: number
  selected: boolean
  onToggle: () => void
}

function FilterOption({ label, count, selected, onToggle }: FilterOptionProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between text-[15px] leading-10 transition-colors hover:text-text-accent',
          selected ? 'text-text-accent' : 'text-text-secondary',
        )}
      >
        <span>{label}</span>
        <span className={cn(selected && 'font-bold')}>({count})</span>
      </button>
    </li>
  )
}
