import type { GuestCartLine } from '@/types/account'
import type { EditionId } from '@/types/catalog'

/**
 * Visitor cart, kept in localStorage so it survives a refresh. It stores only
 * WHAT is in the cart (lines and coupon), never prices: values always come
 * from the API (POST /cart/preview). It is merged into the account on sign-in.
 */
export interface GuestCart {
  items: GuestCartLine[]
  promoCode: string | null
}

const STORAGE_KEY = 'kurio.guest-cart'
const EMPTY: GuestCart = { items: [], promoCode: null }

type Listener = () => void
const listeners = new Set<Listener>()

function read(): GuestCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<GuestCart>
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(
          (i): i is GuestCartLine =>
            typeof i?.nftId === 'string' && typeof i?.editionId === 'string' && Number.isInteger(i?.quantity) && i.quantity > 0,
        )
      : []
    return { items, promoCode: typeof parsed.promoCode === 'string' ? parsed.promoCode : null }
  } catch {
    return EMPTY
  }
}

// Cached snapshot: useSyncExternalStore needs the same object until it changes
let snapshot: GuestCart = read()

function write(next: GuestCart) {
  snapshot = next
  try {
    if (next.items.length === 0 && !next.promoCode) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the cart lasts until the tab closes
  }
  for (const listener of listeners) listener()
}

export const guestCart = {
  get: () => snapshot,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Sets the quantity of one edition; 0 removes the line */
  setItem(nftId: string, editionId: EditionId, quantity: number) {
    const others = snapshot.items.filter((i) => !(i.nftId === nftId && i.editionId === editionId))
    const items = quantity > 0 ? [...others, { nftId, editionId, quantity }] : others
    // Keep the original order of existing lines
    const order = snapshot.items.map((i) => `${i.nftId}:${i.editionId}`)
    items.sort((a, b) => {
      const ia = order.indexOf(`${a.nftId}:${a.editionId}`)
      const ib = order.indexOf(`${b.nftId}:${b.editionId}`)
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
    })
    write({ ...snapshot, items })
  },
  quantityOf(nftId: string, editionId: EditionId) {
    return snapshot.items.find((i) => i.nftId === nftId && i.editionId === editionId)?.quantity ?? 0
  },
  setPromo(promoCode: string | null) {
    write({ ...snapshot, promoCode })
  },
  clear() {
    write(EMPTY)
  },
}

// Other tabs: keep the visitor cart in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      snapshot = read()
      for (const listener of listeners) listener()
    }
  })
}
