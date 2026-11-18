import { http, HttpResponse } from 'msw'
import type { EthString } from '@/lib/eth'
import type { EditionId } from '@/types/catalog'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/realtime'
import { commit, getDb } from '../db'
import { API, apiError, readJson } from '../http-utils'
import { emitRawEvent, publishNftUpdated, setSocketOffline, socketStatus } from '../realtime'
import { findEdition } from './cart'

interface NftChange {
  editionId?: EditionId
  price?: EthString
  available?: number
}

/**
 * Controls of the simulated server, used by the tests and available for manual
 * checks. Events still reach the app through socket.io-client.
 */
export const controlHandlers = [
  // Changes an edition like the market would, and publishes `nft.updated`
  http.post(`${API}/__mock/nfts/:id`, async ({ request, params }) => {
    const nft = getDb().nfts[String(params.id)]
    const change = await readJson<NftChange>(request)
    const edition = nft && findEdition(nft, change?.editionId ?? nft.defaultEditionId)
    if (!nft || !edition) return apiError(404, 'not_found', 'NFT ou edição não encontrada.')

    if (change?.price !== undefined) edition.price = change.price
    if (change?.available !== undefined) edition.available = change.available
    nft.price = findEdition(nft, nft.defaultEditionId)?.price ?? nft.price
    nft.availableEditions = nft.editions.reduce((sum, e) => sum + e.available, 0)
    nft.version += 1
    commit()
    return HttpResponse.json(publishNftUpdated(nft))
  }),

  http.post(`${API}/__mock/socket/emit`, async ({ request }) => {
    const event = await readJson<NftUpdatedEvent | OrderUpdatedEvent>(request)
    emitRawEvent(event as NftUpdatedEvent | OrderUpdatedEvent)
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/__mock/socket/offline`, async ({ request }) => {
    const body = await readJson<{ offline: boolean }>(request)
    setSocketOffline(body?.offline === true)
    return HttpResponse.json({ ok: true })
  }),

  http.get(`${API}/__mock/socket`, () => HttpResponse.json(socketStatus())),
]
