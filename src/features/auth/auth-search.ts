/** Values of the `?auth=` search param that opens the auth dialog on any page */
export const AUTH_TABS = ['entrar', 'criar-conta'] as const
export type AuthTab = (typeof AUTH_TABS)[number]

export function parseAuthTab(value: unknown): AuthTab | undefined {
  return AUTH_TABS.includes(value as AuthTab) ? (value as AuthTab) : undefined
}
