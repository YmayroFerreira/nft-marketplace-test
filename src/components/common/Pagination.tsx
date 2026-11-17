import { cn } from '@/lib/utils'
import chevronIcon from '@/assets/icons/chevron-right.svg'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const MAX_VISIBLE = 4

/** Window of page numbers to show, keeping the current page visible */
function visiblePages(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 1, totalPages - MAX_VISIBLE + 1))
  const end = Math.min(totalPages, start + MAX_VISIBLE - 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const itemClass =
  'grid size-[35px] place-items-center rounded-[4px] border text-lg leading-4 transition-colors'

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação" className={className}>
      <ul className="flex items-center gap-2">
        {visiblePages(page, totalPages).map((n) => {
          const isCurrent = n === page
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => onPageChange(n)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Página ${n}`}
                className={cn(
                  itemClass,
                  isCurrent
                    ? 'border-primary bg-primary font-bold text-primary-foreground'
                    : 'border-border text-foreground hover:border-border-soft hover:bg-accent',
                )}
              >
                {n}
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
            className={cn(itemClass, 'border-border hover:bg-accent disabled:opacity-40')}
          >
            {/* The Figma asset is a down chevron rotated -90° */}
            <img src={chevronIcon} alt="" width={12} height={7} className="-rotate-90" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
