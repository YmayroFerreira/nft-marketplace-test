import axios, { AxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/account'
import { expireSession, getSessionToken } from './session-token'

/**
 * Single HTTP client of the app. It only knows the API contract: there are no
 * fake responses here; in development and in the demo build MSW answers the
 * requests at the network level.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  // Arrays as repeated keys: ?collections=a&collections=b
  paramsSerializer: { indexes: null },
})

api.interceptors.request.use((config) => {
  const token = getSessionToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Error thrown by every API call, with the parsed error body */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  /** Raw response body, e.g. the current cart sent with a 409 conflict */
  readonly body?: unknown

  constructor(status: number, code: string, message: string, fields?: Record<string, string>, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.body = body
  }

  /** Network failures and 5xx can be retried; 4xx are final */
  get isRetryable() {
    return this.status === 0 || this.status >= 500
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data
    const apiError = new ApiError(
      status,
      body?.error?.code ?? (status === 0 ? 'network_error' : 'unknown_error'),
      body?.error?.message ??
        (status === 0 ? 'Sem conexão com o servidor. Verifique sua internet.' : 'Algo deu errado. Tente novamente.'),
      body?.error?.fields,
      body,
    )
    // An expired or invalid session signs the user out everywhere
    if (status === 401 && getSessionToken()) expireSession()
    return Promise.reject(apiError)
  },
)
