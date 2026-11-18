/**
 * Replaces tldts, which MSW pulls in through tough-cookie and which ships the
 * whole public suffix list. The mock API only sees its own origin, so the last
 * two labels are enough, and the first load gets much lighter.
 */
export function getDomain(hostname: string): string | null {
  const labels = hostname.split('.').filter(Boolean)
  return labels.length ? labels.slice(-2).join('.') : null
}
