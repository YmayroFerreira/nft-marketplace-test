import { Link } from '@tanstack/react-router'
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
}

export function Header({ cartCount }: HeaderProps) {
  return (
    <header className="container-page pt-6">
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
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md hover:bg-accent"
            aria-label="Buscar NFTs"
          >
            <img src={searchIcon} alt="" width={20} height={20} />
          </button>

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

          <Link to="/login" className={cn(buttonVariants({ size: 'brand-md' }), 'w-[100px]')}>
            <img src={logoutIcon} alt="" width={18} height={17} />
            Entrar
          </Link>
        </div>
      </div>
    </header>
  )
}
