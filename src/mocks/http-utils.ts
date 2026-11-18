import { delay, HttpResponse } from 'msw'
import type { ApiErrorBody } from '@/types/account'
import { getDb, userIdFromToken, type StoredUser } from './db'
import { getScenario } from './scenarios'

/** Base path of the mock REST API */
export const API = '/api'

/** Set by the mock controls; while null, the scenario decides */
let connectionDown: boolean | null = null

export function setConnectionDown(down: boolean) {
  connectionDown = down
}

/** Waits the scenario latency and applies its connection and random failures */
export async function simulateNetwork(): Promise<Response | null> {
  const { latency, failureRate, connectionFails } = getScenario()
  const [min, max] = latency
  if (max > 0) await delay(min + Math.random() * (max - min))
  if (connectionDown ?? connectionFails) return HttpResponse.error()
  if (failureRate && Math.random() < failureRate) {
    return apiError(503, 'service_unavailable', 'Serviço temporariamente indisponível. Tente novamente.')
  }
  return null
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, fields } }, { status })
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

type AuthResult = { user: StoredUser; error?: never } | { user?: never; error: HttpResponse<ApiErrorBody> }

/** Resolves the user that owns the session token, or a 401 response */
export function requireUser(request: Request): AuthResult {
  const unauthorized = apiError(401, 'unauthorized', 'Sua sessão expirou. Entre novamente.')
  if (getScenario().sessionExpired) return { error: unauthorized }

  const userId = userIdFromToken(bearerToken(request))
  const user = userId ? getDb().users[userId] : undefined
  return user ? { user } : { error: unauthorized }
}

/** Parses a JSON body, returning null when it is missing or invalid */
export async function readJson<T>(request: Request): Promise<Partial<T> | null> {
  try {
    return (await request.json()) as Partial<T>
  } catch {
    return null
  }
}
