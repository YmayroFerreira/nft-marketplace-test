import type { EthString } from '@/lib/eth'
import type { EditionId, Network, Nft } from './catalog'

// ---------- Session ----------

export interface User {
  id: string
  username: string
  email: string
  displayName: string
}

export interface AuthResponse {
  user: User
  /** Bearer token sent in the Authorization header */
  token: string
  /** ISO date the session expires */
  expiresAt: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  username: string
  email: string
  password: string
}

export type SocialProvider = 'google' | 'facebook'

// ---------- Cart ----------

/** A cart line is one edition of one NFT */
export interface CartItem {
  nftId: string
  editionId: EditionId
  editionLabel: string
  name: string
  imageUrl: string
  tokenId: string
  unitPrice: EthString
  /** Copies of this edition in the cart (integer) */
  quantity: number
  lineTotal: EthString
  /** Copies of this edition still for sale: the maximum quantity */
  available: number
}

export interface Cart {
  items: CartItem[]
  itemCount: number
  promoCode: string | null
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  /** Increases on every change; send it back as `expectedVersion` to detect conflicts */
  version: number
  updatedAt: string
}

export interface UpdateCartItemRequest {
  quantity: number
  expectedVersion?: number
}

/** A line of the visitor's cart, kept in the browser until sign-in */
export interface GuestCartLine {
  nftId: string
  editionId: EditionId
  quantity: number
}

/** Visitor cart sent to the API to compute values (POST /cart/preview) or to merge it (POST /cart/merge) */
export interface GuestCartRequest {
  items: GuestCartLine[]
  promoCode?: string | null
}

export interface MergeCartResponse {
  cart: Cart
  /** Lines that could not be merged as-is (sold out, limited stock) */
  adjustments: string[]
}

// ---------- Wallets ----------

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'

export interface Wallet {
  id: string
  label: string
  provider: WalletProvider
  network: Network
  address: string
  ensName: string | null
  isPrimary: boolean
  createdAt: string
}

export interface CreateWalletRequest {
  label: string
  provider: WalletProvider
  network: Network
  address: string
  ensName?: string
  isPrimary?: boolean
}

export type UpdateWalletRequest = Partial<Pick<Wallet, 'label' | 'ensName' | 'isPrimary'>>

// ---------- Orders ----------

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'failed'

/** Snapshot of a cart line at purchase time; later catalog changes never alter it */
export interface OrderItem {
  nftId: string
  editionId: EditionId
  editionLabel: string
  name: string
  imageUrl: string
  tokenId: string
  unitPrice: EthString
  quantity: number
  lineTotal: EthString
}

/** Buyer data from the checkout form */
export interface CollectorDetails {
  fullName: string
  email: string
  phone?: string
}

/**
 * Price quote for the current cart, issued by the API at the review step. The
 * order is placed against this quote: if prices, stock, coupon or fees change
 * before confirmation, the API answers 409 `quote_changed` with a new quote.
 */
export interface CheckoutQuote {
  id: string
  items: OrderItem[]
  promoCode: string | null
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  cartVersion: number
  expiresAt: string
}

/** Simulated wallet connection, required to confirm a purchase */
export interface WalletConnection {
  id: string
  walletId: string
  network: Network
  connectedAt: string
  expiresAt: string
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  wallet: Pick<Wallet, 'id' | 'label' | 'provider' | 'network' | 'address'>
  /** Network chosen at checkout */
  network: Network
  collector: CollectorDetails
  /** Set when the order is confirmed */
  transactionHash: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
  version: number
}

export interface CreateOrderRequest {
  /** Quote the user reviewed; values are revalidated against it */
  quoteId: string
  walletId: string
  connectionId: string
  network: Network
  collector: CollectorDetails
}

// ---------- Profile ----------

export interface Profile {
  displayName: string
  username: string
  email: string
  ensName: string | null
  walletNickname: string | null
  avatarUrl: string | null
  updatedAt: string
}

export type UpdateProfileRequest = Partial<
  Pick<Profile, 'displayName' | 'username' | 'email' | 'ensName' | 'walletNickname' | 'avatarUrl'>
>

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---------- Favorites ----------

export interface Favorites {
  nftIds: string[]
  items: Nft[]
}

// ---------- Errors ----------

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    /** Field-level validation messages */
    fields?: Record<string, string>
  }
}
