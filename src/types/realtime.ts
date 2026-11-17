import type { OrderStatus } from './account'

/**
 * Every realtime event has a stable identity (`eventId`), the affected
 * resource and the resource version after the change. Clients ignore events
 * whose version is not newer than what they already have.
 */
interface RealtimeEventBase<TType extends string, TResource extends string, TData> {
  eventId: string
  type: TType
  resource: { type: TResource; id: string }
  version: number
  occurredAt: string
  data: TData
}

export type NftUpdatedEvent = RealtimeEventBase<
  'nft.updated',
  'nft',
  {
    price: number
    previousPrice?: number
    availableEditions: number
  }
>

export type OrderUpdatedEvent = RealtimeEventBase<
  'order.updated',
  'order',
  {
    status: OrderStatus
    transactionHash: string | null
    failureReason: string | null
  }
>

export interface RealtimeEventMap {
  'nft.updated': NftUpdatedEvent
  'order.updated': OrderUpdatedEvent
}
