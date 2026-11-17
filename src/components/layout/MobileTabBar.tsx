import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import homeIcon from '@/assets/icons/tab-home.svg'
import heartIcon from '@/assets/icons/tab-heart.svg'
import cartIcon from '@/assets/icons/tab-cart.svg'
import userIcon from '@/assets/icons/tab-user.svg'

/**
 * The Figma icons have a fixed fill, so they are applied as a CSS mask and
 * painted with `currentColor`, which lets the active item turn orange.
 */
function TabIcon({ src, width = 20, height = 20 }: { src: string; width?: number; height?: number }) {
  const style: CSSProperties = {
    width,
    height,
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }
  return <span aria-hidden className="block bg-current" style={style} />
}

const itemClass =
  'grid size-12 place-items-center rounded-xl text-text-secondary transition-colors hover:text-text-accent data-[status=active]:text-text-accent'

interface MobileTabBarProps {
  cartCount: number
}

/** Bottom navigation on mobile (the desktop header takes this role on md+) */
export function MobileTabBar({ cartCount }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border-t border-border bg-surface-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-[72px] max-w-[414px] items-center justify-around px-6">
        <li>
          <Link to="/" activeOptions={{ exact: true, includeSearch: false }} aria-label="Início" className={itemClass}>
            <TabIcon src={homeIcon} width={16} height={17} />
          </Link>
        </li>
        <li>
          <Link to="/favoritos" aria-label="Favoritos" className={itemClass}>
            <TabIcon src={heartIcon} height={18} />
          </Link>
        </li>
        <li>
          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            className={`${itemClass} relative`}
          >
            <TabIcon src={cartIcon} />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-primary text-tiny font-medium text-primary-foreground"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link to="/perfil" aria-label="Perfil" className={itemClass}>
            <TabIcon src={userIcon} />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
