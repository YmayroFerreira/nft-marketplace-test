import { useState, type FormEvent } from 'react'
import searchIcon from '@/assets/icons/search-mobile.svg'
import filterIcon from '@/assets/icons/filter.svg'

interface MobileSearchBarProps {
  initialQuery?: string
  onSearch: (query: string) => void
  onOpenFilters: () => void
}

/** Top of the mobile home: search field + filters button (replaces the desktop header) */
export function MobileSearchBar({ initialQuery = '', onSearch, onOpenFilters }: MobileSearchBarProps) {
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(query.trim())
  }

  return (
    <div className="container-page flex gap-2 pt-10 md:hidden">
      <form role="search" onSubmit={handleSubmit} className="relative flex-1">
        <label htmlFor="mobile-search" className="sr-only">
          Buscar coleções e NFTs
        </label>
        <img
          src={searchIcon}
          alt=""
          width={22}
          height={22}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          id="mobile-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Explorar coleções"
          className="h-[45px] w-full rounded-[10px] bg-surface-card pr-3 pl-[42px] text-sm font-bold text-foreground placeholder:text-brand-secondary focus-visible:outline-offset-0"
        />
      </form>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros"
        className="grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(137deg,rgba(210,138,76,0.45)_25%,#d28a4c_100%)]"
      >
        <img src={filterIcon} alt="" width={16} height={16} />
      </button>
    </div>
  )
}
