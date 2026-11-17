import { http, HttpResponse } from 'msw'
import type { Favorites } from '@/types/account'
import { commit, getDb } from '../db'
import { API, apiError, requireUser, simulateNetwork } from '../http-utils'
import { getScenario } from '../scenarios'
import { toListItem } from './catalog'

function toFavorites(userId: string): Favorites {
  const db = getDb()
  const nftIds = (db.favorites[userId] ?? []).filter((id) => db.nfts[id])
  return { nftIds, items: nftIds.map((id) => toListItem(db.nfts[id])) }
}

function favoritesFailure() {
  return getScenario().favoritesFail
    ? apiError(500, 'internal_error', 'Não foi possível atualizar seus favoritos.')
    : null
}

export const favoritesHandlers = [
  http.get(`${API}/favorites`, async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    return HttpResponse.json(toFavorites(auth.user.id))
  }),

  http.put(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const failure = (await simulateNetwork()) ?? favoritesFailure()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const db = getDb()
    const nftId = String(params.nftId)
    if (!db.nfts[nftId]) return apiError(404, 'not_found', 'NFT não encontrado.')

    const list = (db.favorites[auth.user.id] ??= [])
    if (!list.includes(nftId)) list.push(nftId)
    commit()
    return HttpResponse.json(toFavorites(auth.user.id))
  }),

  http.delete(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const failure = (await simulateNetwork()) ?? favoritesFailure()
    if (failure) return failure
    const auth = requireUser(request)
    if (auth.error) return auth.error

    const db = getDb()
    db.favorites[auth.user.id] = (db.favorites[auth.user.id] ?? []).filter((id) => id !== String(params.nftId))
    commit()
    return HttpResponse.json(toFavorites(auth.user.id))
  }),
]
