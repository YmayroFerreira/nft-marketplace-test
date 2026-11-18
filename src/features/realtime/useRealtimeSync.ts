import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Cart, Order } from '@/types/account'
import type { Nft, NftDetail, Paginated } from '@/types/catalog'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/realtime'
import { accountKeys } from '../account/keys'
import { useAuth } from '../auth/auth-context'
import { catalogKeys } from '../catalog/queries'

const MAX_REMEMBERED_EVENTS = 500

/** Applies an `nft.updated` payload only if it is newer than the cached NFT */
function applyNftEvent<T extends Nft>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.resource.id || nft.version >= event.version) return nft
  const { editions: editionChanges, ...listFields } = event.data
  const updated = { ...nft, ...listFields, version: event.version }
  // Detail data has editions: merge price/stock, keeping label and total
  if ('editions' in nft && Array.isArray(nft.editions)) {
    const detail = updated as unknown as NftDetail
    detail.editions = detail.editions.map((edition) => ({
      ...edition,
      ...editionChanges.find((change) => change.id === edition.id),
    }))
  }
  return updated
}

function handleNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent, userId: string | null) {
  queryClient.setQueriesData<Paginated<Nft>>({ queryKey: catalogKeys.lists() }, (page) =>
    page ? { ...page, items: page.items.map((nft) => applyNftEvent(nft, event)) } : page,
  )
  queryClient.setQueriesData<Nft>({ queryKey: catalogKeys.featured() }, (nft) => (nft ? applyNftEvent(nft, event) : nft))
  queryClient.setQueriesData<Nft>({ queryKey: catalogKeys.detail(event.resource.id) }, (nft) =>
    nft ? applyNftEvent(nft, event) : nft,
  )
  queryClient.setQueriesData<Nft[]>({ queryKey: [...catalogKeys.all, 'related'] }, (list) =>
    list?.map((nft) => applyNftEvent(nft, event)),
  )

  // Prices in the cart are computed by the server: refetch it if the NFT is there
  if (userId) {
    const cart = queryClient.getQueryData<Cart>(accountKeys.cart(userId))
    if (cart?.items.some((item) => item.nftId === event.resource.id)) {
      void queryClient.invalidateQueries({ queryKey: accountKeys.cart(userId) })
    }
  }
}

function handleOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, userId: string) {
  queryClient.setQueryData<Order>(accountKeys.order(userId, event.resource.id), (order) => {
    if (!order || order.version >= event.version) return order
    return { ...order, ...event.data, version: event.version, updatedAt: event.occurredAt }
  })
  if (event.data.status === 'confirmed' || event.data.status === 'failed') {
    // A failed order puts the items back in the cart
    void queryClient.invalidateQueries({ queryKey: accountKeys.cart(userId) })
    void queryClient.invalidateQueries({ queryKey: accountKeys.orders(userId), exact: true })
  }
}

/** Keeps the REST caches in sync with the Socket.IO events. Mounted once in the root layout. */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    const seen = new Set<string>()
    const isDuplicate = (eventId: string) => {
      if (seen.has(eventId)) return true
      seen.add(eventId)
      if (seen.size > MAX_REMEMBERED_EVENTS) seen.delete(seen.values().next().value!)
      return false
    }

    const onNft = (event: NftUpdatedEvent) => {
      if (!isDuplicate(event.eventId)) handleNftUpdated(queryClient, event, userId)
    }
    const onOrder = (event: OrderUpdatedEvent) => {
      if (userId && !isDuplicate(event.eventId)) handleOrderUpdated(queryClient, event, userId)
    }
    // After a reconnection, refetch what may have changed while offline
    const onReconnect = () => void queryClient.invalidateQueries({ queryKey: catalogKeys.all })

    // Socket.IO is loaded on demand so it does not delay the first render
    let isActive = true
    let unsubscribe: (() => void) | undefined
    void import('@/api/realtime').then(({ getRealtimeSocket }) => {
      if (!isActive) return
      const socket = getRealtimeSocket()
      socket.on('nft.updated', onNft)
      socket.on('order.updated', onOrder)
      socket.io.on('reconnect', onReconnect)
      unsubscribe = () => {
        socket.off('nft.updated', onNft)
        socket.off('order.updated', onOrder)
        socket.io.off('reconnect', onReconnect)
      }
    })
    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [queryClient, userId])
}
