import { http, HttpResponse } from 'msw'
import { commit, getDb } from '../db'
import { blogPosts, promos } from '../fixtures/content'
import { API, apiError, readJson, simulateNetwork } from '../http-utils'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const contentHandlers = [
  http.get(`${API}/promos`, async () => {
    const failure = await simulateNetwork()
    if (failure) return failure
    return HttpResponse.json(promos)
  }),

  http.get(`${API}/blog/posts`, async () => {
    const failure = await simulateNetwork()
    if (failure) return failure
    return HttpResponse.json(blogPosts)
  }),

  http.post(`${API}/newsletter`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const body = await readJson<{ email: string }>(request)
    const email = body?.email?.trim().toLowerCase() ?? ''
    if (!EMAIL_PATTERN.test(email)) {
      return apiError(422, 'validation_error', 'Informe um e-mail válido.', { email: 'Informe um e-mail válido.' })
    }

    const db = getDb()
    if (db.newsletter.includes(email)) {
      return apiError(409, 'already_subscribed', 'Este e-mail já está inscrito.')
    }
    db.newsletter.push(email)
    commit()
    return HttpResponse.json({ subscribed: true }, { status: 201 })
  }),
]
