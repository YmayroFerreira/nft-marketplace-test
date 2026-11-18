import { http, HttpResponse } from 'msw'
import type { ChangePasswordRequest, UpdateProfileRequest } from '@/types/account'
import { commit, getDb } from '../db'
import { API, apiError, readJson, requireUser, simulateNetwork } from '../http-utils'
import { hashPassword, verifyPassword } from '../password'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ENS_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i
const MIN_PASSWORD_LENGTH = 8

export const profileHandlers = [
  http.get(`${API}/profile`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const profile = getDb().profiles[auth.user.id]
    return profile ? HttpResponse.json(profile) : apiError(404, 'not_found', 'Perfil não encontrado.')
  }),

  http.patch(`${API}/profile`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const db = getDb()
    const userId = auth.user.id
    const profile = db.profiles[userId]
    const body = (await readJson<UpdateProfileRequest>(request)) ?? {}
    const others = Object.values(db.users).filter((u) => u.id !== userId)

    const fields: Record<string, string> = {}
    if (body.displayName !== undefined && !body.displayName.trim())
      fields.displayName = 'Informe um nome de exibição.'
    if (body.username !== undefined) {
      if (body.username.trim().length < 3) fields.username = 'O nome de usuário precisa ter ao menos 3 caracteres.'
      else if (others.some((u) => u.username.toLowerCase() === body.username!.trim().toLowerCase()))
        fields.username = 'Este nome de usuário já está em uso.'
    }
    if (body.email !== undefined) {
      if (!EMAIL_PATTERN.test(body.email.trim())) fields.email = 'Informe um e-mail válido.'
      else if (others.some((u) => u.email.toLowerCase() === body.email!.trim().toLowerCase()))
        fields.email = 'Este e-mail já está em uso.'
    }
    if (body.ensName && !ENS_PATTERN.test(body.ensName.trim())) fields.ensName = 'O nome ENS precisa terminar em .eth.'
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Confira os campos.', fields)

    const trimmed = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]),
    ) as UpdateProfileRequest
    Object.assign(profile, trimmed, { updatedAt: new Date().toISOString() })

    // Keep the account record in sync with the profile
    const user = db.users[userId]
    user.displayName = profile.displayName
    user.username = profile.username
    user.email = profile.email
    commit()
    return HttpResponse.json(profile)
  }),

  http.put(`${API}/profile/password`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const body = await readJson<ChangePasswordRequest>(request)
    if (!(await verifyPassword(body?.currentPassword ?? '', auth.user.password))) {
      return apiError(422, 'validation_error', 'Confira os campos.', { currentPassword: 'Senha atual incorreta.' })
    }
    if (!body?.newPassword || body.newPassword.length < MIN_PASSWORD_LENGTH) {
      return apiError(422, 'validation_error', 'Confira os campos.', {
        newPassword: `A nova senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      })
    }
    getDb().users[auth.user.id].password = await hashPassword(body.newPassword)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),
]
