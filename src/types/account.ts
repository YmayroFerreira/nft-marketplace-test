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

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  wallet: Pick<Wallet, 'id' | 'label' | 'provider' | 'network' | 'address'>
  /** Set when the order is confirmed */
  transactionHash: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
  version: number
}

export interface CreateOrderRequest {
  walletId: string
  /** Cart version the user reviewed; the order is rejected if the cart changed since */
  cartVersion: number
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
