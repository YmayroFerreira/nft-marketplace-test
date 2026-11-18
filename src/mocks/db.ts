import type { CheckoutQuote, Order, Profile, User, Wallet, WalletConnection } from '@/types/account'
import type { EditionId, NftDetail } from '@/types/catalog'
import { createSeedNfts } from './fixtures/nfts'
import type { PasswordHash } from './password'

/**
 * In-memory database of the mock API, persisted to localStorage so data
 * survives a page refresh. Reset it with `?mockReset` in the URL.
 *
 * Every record that belongs to a user is keyed by user id, and handlers only
 * read records of the user that owns the session token, so data never leaks
 * between users.
 */

/** Bump the version when the stored shape changes, so old data is discarded */
const STORAGE_KEY = 'kurio.mock.db.v4'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

export interface StoredUser extends User {
  /** Never the password itself: PBKDF2 hash with a per-user salt */
  password: PasswordHash
}

export interface StoredCart {
  items: { nftId: string; editionId: EditionId; quantity: number }[]
  promoCode: string | null
  version: number
  updatedAt: string
}

export interface StoredOrder extends Order {
  userId: string
  idempotencyKey: string
}

export interface StoredQuote extends CheckoutQuote {
  userId: string
}

export interface StoredConnection extends WalletConnection {
  userId: string
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
  quotes: Record<string, StoredQuote>
  walletConnections: Record<string, StoredConnection>
  newsletter: string[]
  sequence: number
}

/**
 * Fictitious demo account, documented in the README (password: kurio1234).
 * Only its hash is stored; it was computed once with the same PBKDF2 settings.
 */
export const DEMO_USER = {
  id: 'user-demo',
  email: 'colecionador@kurio.dev',
  username: 'colecionador',
  displayName: 'Nova Colecionadora',
}

const DEMO_PASSWORD_HASH: PasswordHash = {
  algorithm: 'PBKDF2-SHA256',
  iterations: 100_000,
  salt: 'a3f1c9d27e5b4086b1c2d3e4f5a69788',
  hash: '35f28b00538b39eb9ecbc7e42c09b9ff66abe9f05692f62c4fa833c51a7b6728',
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
  return {
    nfts,
    users: { [DEMO_USER.id]: { ...DEMO_USER, password: DEMO_PASSWORD_HASH } },
    sessions: {},
    carts: {
      // Same items as the cart screen in the Figma
      [DEMO_USER.id]: {
        items: [
          { nftId: 'emerald-ape-042', editionId: '1-50', quantity: 2 },
          { nftId: 'violet-nomad-314', editionId: '1-50', quantity: 6 },
          { nftId: 'ivory-baron-088', editionId: '1-50', quantity: 9 },
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
    quotes: {},
    walletConnections: {},
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
