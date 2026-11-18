import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import searchIcon from '@/assets/icons/search.svg'
import cartIcon from '@/assets/icons/cart.svg'
import logoutIcon from '@/assets/icons/logout.svg'

interface NavItem {
  label: string
  /** Items without a route yet are rendered as plain text */
  to?: '/'
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', to: '/' },
  { label: 'Mercado' },
  { label: 'Criadores' },
  { label: 'Aprenda' },
]

interface HeaderProps {
  cartCount: number
  /** Name of the signed-in user; the sign-in button becomes a profile link */
  userName?: string
}

export function Header({ cartCount, userName }: HeaderProps) {
  return (
    // On mobile the bottom tab bar and the page's own top bar replace the header
    <header className="container-page hidden pt-6 md:block">
      <div className="flex items-start justify-between border-b border-border">
        <Link
          to="/"
          className="w-40 pt-2 text-sm font-bold tracking-[0.1em] text-foreground"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex gap-10">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    className="block border-b-[3px] border-transparent pb-[21px] text-base text-foreground transition-colors hover:text-text-accent data-[status=active]:border-text-accent data-[status=active]:font-bold data-[status=active]:text-text-accent"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="block pb-6 text-base text-foreground/60" title="Em breve">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-7 pb-2.5">
          <HeaderSearch />

          <Link
            to="/carrinho"
            className="relative grid size-8 place-items-center rounded-md hover:bg-accent"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
          >
            <img src={cartIcon} alt="" width={24} height={24} />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute top-0 right-0 grid size-4 place-items-center rounded-full bg-primary text-tiny font-medium text-primary-foreground"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {userName ? (
            <Link
              to="/perfil"
              className={cn(buttonVariants({ size: 'brand-md' }), 'max-w-[180px]')}
              aria-label={`Meu perfil, ${userName}`}
            >
              <span className="truncate">{userName.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="."
              search={(prev) => ({ ...prev, auth: 'entrar' })}
              resetScroll={false}
              className={cn(buttonVariants({ size: 'brand-md' }), 'w-[100px]')}
            >
              <img src={logoutIcon} alt="" width={18} height={17} />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

/** Desktop search: the magnifier opens a field that searches the catalog (/?q=...) */
function HeaderSearch() {
  const navigate = useNavigate()
  const { q } = useSearch({ strict: false })
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const toggleRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)

  // The magnifier only exists again after the re-render, so focus it in an effect
  useEffect(() => {
    if (!isOpen && restoreFocus.current) {
      restoreFocus.current = false
      toggleRef.current?.focus()
    }
  }, [isOpen])

  function open() {
    setQuery(typeof q === 'string' ? q : '')
    setIsOpen(true)
  }

  function close() {
    restoreFocus.current = true
    setIsOpen(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    setIsOpen(false)
    void navigate({ to: '/', search: term ? { q: term } : {}, hash: 'catalogo' })
  }

  if (!isOpen) {
    return (
      <button
        ref={toggleRef}
        type="button"
        onClick={open}
        aria-expanded={false}
        className="grid size-8 place-items-center rounded-md hover:bg-accent"
        aria-label="Buscar NFTs"
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    )
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-2">
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="header-search"
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
        placeholder="Buscar NFTs..."
        className="h-9 w-56 rounded-md border border-border-soft bg-surface-card px-3 text-sm text-foreground placeholder:text-brand-secondary focus-visible:border-primary focus-visible:outline-none"
      />
      <button
        type="submit"
        className="grid size-8 place-items-center rounded-md hover:bg-accent"
        aria-label="Buscar"
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    </form>
  )
}
