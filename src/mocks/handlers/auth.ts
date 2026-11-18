import { http, HttpResponse } from 'msw'
import type { AuthResponse, SignInRequest, SignUpRequest, SocialProvider } from '@/types/account'
import { commit, createSession, deleteSession, getDb, nextId, publicUser, type StoredUser } from '../db'
import { API, apiError, bearerToken, readJson, requireUser, simulateNetwork } from '../http-utils'
import { hashPassword, verifyPassword } from '../password'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function authResponse(user: StoredUser, status = 200) {
  const { token, expiresAt } = createSession(user.id)
  const body: AuthResponse = { user: publicUser(user), token, expiresAt }
  return HttpResponse.json(body, { status })
}

async function createUser(data: { username: string; email: string; password: string; displayName: string }) {
  const db = getDb()
  const user: StoredUser = { id: nextId('user'), ...data, password: await hashPassword(data.password) }
  db.users[user.id] = user
  db.profiles[user.id] = {
    displayName: data.displayName,
    username: data.username,
    email: data.email,
    ensName: null,
    walletNickname: null,
    avatarUrl: null,
    updatedAt: new Date().toISOString(),
  }
  db.wallets[user.id] = []
  db.favorites[user.id] = []
  commit()
  return user
}

function findUserByEmail(email: string) {
  return Object.values(getDb().users).find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export const authHandlers = [
  http.post(`${API}/auth/sign-up`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const body = await readJson<SignUpRequest>(request)
    const username = body?.username?.trim() ?? ''
    const email = body?.email?.trim().toLowerCase() ?? ''
    const password = body?.password ?? ''

    const fields: Record<string, string> = {}
    if (username.length < 3) fields.username = 'O nome de usuário precisa ter ao menos 3 caracteres.'
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (password.length < MIN_PASSWORD_LENGTH)
      fields.password = `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Confira os campos.', fields)

    const users = Object.values(getDb().users)
    if (users.some((u) => u.email.toLowerCase() === email))
      return apiError(409, 'email_taken', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase()))
      return apiError(409, 'username_taken', 'Este nome de usuário já está em uso.', {
        username: 'Este nome de usuário já está em uso.',
      })

    const user = await createUser({ username, email, password, displayName: username })
    return authResponse(user, 201)
  }),

  http.post(`${API}/auth/sign-in`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const body = await readJson<SignInRequest>(request)
    const user = findUserByEmail(body?.email?.trim() ?? '')
    if (!user || !(await verifyPassword(body?.password ?? '', user.password))) {
      return apiError(401, 'invalid_credentials', 'E-mail ou senha incorretos.')
    }
    return authResponse(user)
  }),

  /** Fake social sign-in: signs in (or creates) a fixed account per provider */
  http.post(`${API}/auth/social`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const body = await readJson<{ provider: SocialProvider }>(request)
    const provider = body?.provider
    if (provider !== 'google' && provider !== 'facebook') {
      return apiError(422, 'validation_error', 'Provedor inválido.')
    }
    const email = `${provider}.colecionador@kurio.dev`
    const user =
      findUserByEmail(email) ??
      (await createUser({
        username: `${provider}_colecionador`,
        email,
        password: crypto.randomUUID(),
        displayName: provider === 'google' ? 'Colecionador Google' : 'Colecionador Facebook',
      }))
    return authResponse(user)
  }),

  /**
   * Password reset request. Always answers 202 for a valid e-mail, whether an
   * account exists or not, so the endpoint cannot be used to find accounts.
   */
  http.post(`${API}/auth/password-reset`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const body = await readJson<{ email: string }>(request)
    const email = body?.email?.trim() ?? ''
    if (!EMAIL_PATTERN.test(email)) {
      return apiError(422, 'validation_error', 'Informe um e-mail válido.', { email: 'Informe um e-mail válido.' })
    }
    return HttpResponse.json({ sent: true }, { status: 202 })
  }),

  http.post(`${API}/auth/sign-out`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const token = bearerToken(request)
    if (token) deleteSession(token)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/auth/session`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const auth = requireUser(request)
    if (auth.error) return auth.error
    return HttpResponse.json({ user: publicUser(auth.user) })
  }),
]
