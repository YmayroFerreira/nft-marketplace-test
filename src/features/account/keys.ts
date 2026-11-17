/**
 * Query keys of data that belongs to the signed-in user. Every key includes the
 * user id, so one user's cached data can never be shown to another; all of
 * them are removed on sign-out.
 */
export const accountKeys = {
  all: ['account'] as const,
  session: (token: string | null) => ['session', token] as const,
  cart: (userId: string) => [...accountKeys.all, userId, 'cart'] as const,
  favorites: (userId: string) => [...accountKeys.all, userId, 'favorites'] as const,
  wallets: (userId: string) => [...accountKeys.all, userId, 'wallets'] as const,
  profile: (userId: string) => [...accountKeys.all, userId, 'profile'] as const,
  orders: (userId: string) => [...accountKeys.all, userId, 'orders'] as const,
  order: (userId: string, orderId: string) => [...accountKeys.orders(userId), orderId] as const,
}
