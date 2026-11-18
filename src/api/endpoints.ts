import type {
  AuthResponse,
  Cart,
  CheckoutQuote,
  ExplorerTransaction,
  GuestCartRequest,
  MergeCartResponse,
  WalletConnection,
  ChangePasswordRequest,
  CreateOrderRequest,
  CreateWalletRequest,
  Favorites,
  Order,
  Profile,
  SignInRequest,
  SignUpRequest,
  SocialProvider,
  UpdateCartItemRequest,
  UpdateProfileRequest,
  UpdateWalletRequest,
  User,
  Wallet,
} from '@/types/account'
import type { CatalogFacets, CatalogQuery, EditionId, Network, Nft, NftDetail, NftReview, Paginated } from '@/types/catalog'
import type { BlogPost, Promo } from '@/types/content'
import { api } from './client'

/** One function per REST endpoint. The contracts are documented in ARCHITECTURE.md. */

// ---------- Catalog ----------

export const catalogApi = {
  list: (query: CatalogQuery) => api.get<Paginated<Nft>>('/nfts', { params: query }).then((r) => r.data),
  facets: () => api.get<CatalogFacets>('/nfts/facets').then((r) => r.data),
  featured: () => api.get<Nft>('/nfts/featured').then((r) => r.data),
  detail: (id: string) => api.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`).then((r) => r.data),
  related: (id: string, limit = 5) =>
    api.get<Nft[]>(`/nfts/${encodeURIComponent(id)}/related`, { params: { limit } }).then((r) => r.data),
  reviews: (id: string, page = 1) =>
    api.get<Paginated<NftReview>>(`/nfts/${encodeURIComponent(id)}/reviews`, { params: { page } }).then((r) => r.data),
}

// ---------- Content ----------

export const contentApi = {
  promos: () => api.get<Promo[]>('/promos').then((r) => r.data),
  blogPosts: () => api.get<BlogPost[]>('/blog/posts').then((r) => r.data),
  subscribeNewsletter: (email: string) => api.post('/newsletter', { email }).then(() => undefined),
}

// ---------- Auth ----------

export const authApi = {
  signIn: (body: SignInRequest) => api.post<AuthResponse>('/auth/sign-in', body).then((r) => r.data),
  signUp: (body: SignUpRequest) => api.post<AuthResponse>('/auth/sign-up', body).then((r) => r.data),
  social: (provider: SocialProvider) => api.post<AuthResponse>('/auth/social', { provider }).then((r) => r.data),
  signOut: () => api.post('/auth/sign-out').then(() => undefined),
  requestPasswordReset: (email: string) => api.post('/auth/password-reset', { email }).then(() => undefined),
  session: () => api.get<{ user: User }>('/auth/session').then((r) => r.data.user),
}

// ---------- Cart ----------

export const cartApi = {
  get: () => api.get<Cart>('/cart').then((r) => r.data),
  /** A cart line is one edition of one NFT */
  setItem: (nftId: string, editionId: EditionId, body: UpdateCartItemRequest) =>
    api.put<Cart>(`/cart/items/${encodeURIComponent(nftId)}/${editionId}`, body).then((r) => r.data),
  removeItem: (nftId: string, editionId: EditionId) =>
    api.delete<Cart>(`/cart/items/${encodeURIComponent(nftId)}/${editionId}`).then((r) => r.data),
  applyPromo: (code: string) => api.post<Cart>('/cart/promo', { code }).then((r) => r.data),
  removePromo: () => api.delete<Cart>('/cart/promo').then((r) => r.data),
  /** Values of a visitor cart (kept in the browser), computed by the API */
  preview: (body: GuestCartRequest) => api.post<Cart>('/cart/preview', body).then((r) => r.data),
  /** Merges the visitor cart into the account right after sign-in */
  merge: (body: GuestCartRequest) => api.post<MergeCartResponse>('/cart/merge', body).then((r) => r.data),
}

// ---------- Checkout ----------

export const checkoutApi = {
  /** Review step: the API freezes the values; the order is placed against this quote */
  quote: () => api.post<CheckoutQuote>('/checkout/quote').then((r) => r.data),
  connectWallet: (walletId: string, network: Network) =>
    api.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/connect`, { network }).then((r) => r.data),
  disconnectWallet: (connectionId: string) =>
    api.delete(`/wallet-connections/${encodeURIComponent(connectionId)}`).then(() => undefined),
}

// ---------- Favorites ----------

export const favoritesApi = {
  list: () => api.get<Favorites>('/favorites').then((r) => r.data),
  add: (nftId: string) => api.put<Favorites>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
  remove: (nftId: string) => api.delete<Favorites>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
}

// ---------- Orders ----------

export const ordersApi = {
  /**
   * `idempotencyKey` must be generated once per checkout attempt and reused on
   * retries, so a double click or a retry never creates two orders.
   */
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    api.post<Order>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  list: () => api.get<Order[]>('/orders').then((r) => r.data),
  get: (id: string) => api.get<Order>(`/orders/${encodeURIComponent(id)}`).then((r) => r.data),
}

// ---------- Explorer (simulated) ----------

export const explorerApi = {
  transaction: (hash: string) =>
    api.get<ExplorerTransaction>(`/explorer/tx/${encodeURIComponent(hash)}`).then((r) => r.data),
}

// ---------- Wallets ----------

export const walletsApi = {
  list: () => api.get<Wallet[]>('/wallets').then((r) => r.data),
  create: (body: CreateWalletRequest) => api.post<Wallet>('/wallets', body).then((r) => r.data),
  update: (id: string, body: UpdateWalletRequest) =>
    api.patch<Wallet>(`/wallets/${encodeURIComponent(id)}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/wallets/${encodeURIComponent(id)}`).then(() => undefined),
}

// ---------- Profile ----------

export const profileApi = {
  get: () => api.get<Profile>('/profile').then((r) => r.data),
  update: (body: UpdateProfileRequest) => api.patch<Profile>('/profile', body).then((r) => r.data),
  changePassword: (body: ChangePasswordRequest) => api.put('/profile/password', body).then(() => undefined),
}
