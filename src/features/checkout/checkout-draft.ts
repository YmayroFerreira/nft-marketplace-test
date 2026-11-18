import type { CollectorDetails } from '@/types/account'
import type { Network } from '@/types/catalog'

/**
 * What the user already filled in at checkout, kept in sessionStorage so it
 * survives a session expiry (sign in again → continue where they were).
 * Tied to the user id: another account never sees it. The wallet connection
 * and the quote are NOT kept: they must be redone after signing in again.
 */
export interface CheckoutDraft {
  userId: string
  collector: CollectorDetails
  walletId?: string
  network?: Network
}

const STORAGE_KEY = 'kurio.checkout-draft'

export function loadCheckoutDraft(userId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as CheckoutDraft
    return draft.userId === userId ? draft : null
  } catch {
    return null
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Not persisted: the user fills the form again
  }
}

export function clearCheckoutDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear
  }
}
