import type { Order, Profile, User, Wallet } from '@/types/account'
import type { NftDetail } from '@/types/catalog'
import { createSeedNfts } from './fixtures/nfts'

/**
 * In-memory database of the mock API, persisted to localStorage so data
 * survives a page refresh. Reset it with `?mockReset` in the URL.
 *
 * Every record that belongs to a user is keyed by user id, and handlers only
 * read records of the user that owns the session token, so data never leaks
 * between users.
 */

const STORAGE_KEY = 'kurio.mock.db.v1'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

export interface StoredUser extends User {
  /** Mock only: plain text, never do this in a real backend */
  password: string
}

export interface StoredCart {
  items: { nftId: string; quantity: number }[]
  promoCode: string | null
  version: number
  updatedAt: string
}

export interface StoredOrder extends Order {
  userId: string
  idempotencyKey: string
}

export interface MockDb {
  nfts: Record<string, NftDetail>
  users: Record<string, StoredUser>
  sessions: Record<string, { userId: string; expiresAt: string }>
  carts: Record<string, StoredCart>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  profiles: Record<string, Profile>
  orders: Record<string, StoredOrder>
  newsletter: string[]
  sequence: number
}

/** Fictitious demo account, documented in the README */
export const DEMO_USER = {
  id: 'user-demo',
  email: 'colecionador@kurio.dev',
  password: 'kurio1234',
  username: 'colecionador',
  displayName: 'Nova Colecionadora',
}

function now() {
  return new Date().toISOString()
}

function emptyCart(): StoredCart {
  return { items: [], promoCode: null, version: 1, updatedAt: now() }
}

function seed(): MockDb {
  const nfts = Object.fromEntries(createSeedNfts().map((nft) => [nft.id, nft]))
  const createdAt = now()
  const { password, ...demoUser } = DEMO_USER

  return {
    nfts,
    users: { [DEMO_USER.id]: { ...demoUser, password } },
    sessions: {},
    carts: {
      // Same items as the cart screen in the Figma
      [DEMO_USER.id]: {
        items: [
          { nftId: 'emerald-ape-042', quantity: 2 },
          { nftId: 'violet-nomad-314', quantity: 6 },
          { nftId: 'ivory-baron-088', quantity: 9 },
        ],
        promoCode: null,
        version: 1,
        updatedAt: createdAt,
      },
    },
    favorites: { [DEMO_USER.id]: ['neon-vessel-552'] },
    wallets: {
      [DEMO_USER.id]: [
        {
          id: 'wallet-demo-metamask',
          label: 'Principal',
          provider: 'metamask',
          network: 'ethereum',
          address: '0xA91F3c5b7D2e4F6a8B0c1D3e5F7a9B1c3D5eE82C',
          ensName: 'colecionador.kurio.eth',
          isPrimary: true,
          createdAt,
        },
        {
          id: 'wallet-demo-coinbase',
          label: 'Reserva',
          provider: 'coinbase',
          network: 'polygon',
          address: '0x5B2c8E1f4A7d0C3b6E9f2A5d8C1b4E7a0D3f6B9c',
          ensName: 'nova.kurio.eth',
          isPrimary: false,
          createdAt,
        },
      ],
    },
    profiles: {
      [DEMO_USER.id]: {
        displayName: DEMO_USER.displayName,
        username: DEMO_USER.username,
        email: DEMO_USER.email,
        ensName: 'colecionador.kurio.eth',
        walletNickname: 'Principal',
        avatarUrl: null,
        updatedAt: createdAt,
      },
    },
    orders: {},
    newsletter: [],
    sequence: 1000,
  }
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockDb
  } catch {
    // Corrupted or unavailable storage: start from the seed
  }
  return seed()
}

let db: MockDb = load()

export function getDb() {
  return db
}

/** Persists the current state; call after every mutation */
export function commit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Storage full or blocked: keep working in memory
  }
}

export function resetDb() {
  db = seed()
  commit()
}

export function nextId(prefix: string) {
  db.sequence += 1
  return `${prefix}-${db.sequence.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// ---------- Sessions ----------

export function createSession(userId: string) {
  const token = `mock_${crypto.randomUUID()}`
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.sessions[token] = { userId, expiresAt }
  commit()
  return { token, expiresAt }
}

export function userIdFromToken(token: string | null): string | null {
  if (!token) return null
  const session = db.sessions[token]
  if (!session) return null
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token]
    commit()
    return null
  }
  return session.userId
}

export function deleteSession(token: string) {
  delete db.sessions[token]
  commit()
}

// ---------- Per-user records ----------

export function getCart(userId: string) {
  db.carts[userId] ??= emptyCart()
  return db.carts[userId]
}

export function touchCart(cart: StoredCart) {
  cart.version += 1
  cart.updatedAt = now()
}

export function publicUser(user: StoredUser): User {
  const { password: _password, ...rest } = user
  return rest
}
