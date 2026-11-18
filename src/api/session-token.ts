/**
 * Stores the session token. Kept outside React so the Axios client and the
 * Socket.IO client can read it.
 */
const STORAGE_KEY = 'kurio.session.token'

type Listener = (token: string | null) => void
const listeners = new Set<Listener>()

let token: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
})()

export function getSessionToken() {
  return token
}

export function setSessionToken(next: string | null) {
  token = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, next)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the session lasts until the tab closes
  }
  for (const listener of listeners) listener(next)
}

const expiredListeners = new Set<() => void>()

/** The API rejected the token (401): drop it and tell the app the session expired */
export function expireSession() {
  setSessionToken(null)
  for (const listener of expiredListeners) listener()
}

/** Notifies only when the session expired (not on a regular sign-out) */
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}

/** Notifies when the user signs in, signs out or the session expires */
export function onSessionTokenChange(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
