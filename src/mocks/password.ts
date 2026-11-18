/**
 * Password hashing for the mock API. Passwords are never stored in plain
 * text: only a PBKDF2-SHA256 hash with a random per-user salt is kept.
 * Uses the Web Crypto API (crypto.subtle), available in browsers and Node.
 */

const ITERATIONS = 100_000
const KEY_LENGTH_BITS = 256

export interface PasswordHash {
  algorithm: 'PBKDF2-SHA256'
  iterations: number
  salt: string
  hash: string
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string) {
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_LENGTH_BITS,
  )
  return toHex(new Uint8Array(bits))
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return {
    algorithm: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toHex(salt),
    hash: await derive(password, salt, ITERATIONS),
  }
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await derive(password, fromHex(stored.salt), stored.iterations)
  // Constant-time comparison
  if (candidate.length !== stored.hash.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i)
  return diff === 0
}
