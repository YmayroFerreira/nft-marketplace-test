import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CatalogSort, CatalogTab } from '@/types/catalog'

const TABS: { value: CatalogTab; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
]

interface CatalogToolbarProps {
  tab: CatalogTab
  sort: CatalogSort
  onTabChange: (tab: CatalogTab) => void
  onSortChange: (sort: CatalogSort) => void
}

export function CatalogToolbar({ tab, sort, onTabChange, onSortChange }: CatalogToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div
        role="group"
        aria-label="Filtrar catálogo"
        className="-mx-1 flex gap-4 overflow-x-auto px-1 whitespace-nowrap md:mx-0 md:gap-5 md:overflow-visible md:px-0"
      >
        {TABS.map((item) => {
          const isActive = item.value === tab
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTabChange(item.value)}
              className={cn(
                'shrink-0 border-b-2 pb-1 text-sm leading-4 transition-colors hover:text-text-accent md:text-[15px] md:font-medium',
                isActive
                  ? 'border-text-accent font-bold text-text-accent'
                  : 'border-transparent text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-[15px] text-foreground">
        <span id="catalog-sort-label">Ordenar por:</span>
        <Select
          items={SORT_OPTIONS}
          value={sort}
          onValueChange={(next) => next && onSortChange(next as CatalogSort)}
        >
          <SelectTrigger
            aria-labelledby="catalog-sort-label"
            className="h-auto gap-2 border-0 bg-transparent p-0 text-[15px] text-foreground hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent [&_svg]:text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
