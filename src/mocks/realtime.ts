import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftDetail } from '@/types/catalog'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/realtime'
import { commit, getDb, userIdFromToken, type StoredOrder } from './db'
import { scaleEth } from '@/lib/eth'
import { getScenario } from './scenarios'

/**
 * Fake Socket.IO server. MSW intercepts the WebSocket the real
 * `socket.io-client` opens and `@mswjs/socket.io-binding` speaks the Socket.IO
 * protocol on top of it, so the app code is exactly what it would be against
 * a real server.
 *
 * Events always originate here (price ticks, order progress), never from the UI.
 */

/**
 * MSW strips the `/socket.io/` path prefix before matching, so the link is the
 * app origin itself. That also matches other same-origin sockets (e.g. Vite's
 * HMR socket in development), which the handler passes through untouched.
 */
const socketLink = ws.link(window.location.origin.replace(/^http/, 'ws'))
const SOCKET_IO_PATH = '/socket.io/'

/** Engine.IO ping interval announced by the binding's handshake is 25s */
const PING_INTERVAL_MS = 20_000

interface Connection {
  io: ReturnType<typeof toSocketIo>
  userId: string | null
}

const connections = new Set<Connection>()
let priceTicker: ReturnType<typeof setInterval> | null = null

function event<T extends NftUpdatedEvent | OrderUpdatedEvent>(
  type: T['type'],
  resource: T['resource'],
  version: number,
  data: T['data'],
): T {
  return {
    eventId: crypto.randomUUID(),
    type,
    resource,
    version,
    occurredAt: new Date().toISOString(),
    data,
  } as T
}

export function publishNftUpdated(nft: NftDetail) {
  const payload = event<NftUpdatedEvent>('nft.updated', { type: 'nft', id: nft.id }, nft.version, {
    price: nft.price,
    previousPrice: nft.previousPrice,
    availableEditions: nft.availableEditions,
    editions: nft.editions.map((e) => ({ id: e.id, price: e.price, available: e.available })),
  })
  for (const connection of connections) connection.io.client.emit('nft.updated', payload)
}

/** Order events go only to the sockets of the user who owns the order */
export function publishOrderUpdated(order: StoredOrder) {
  const payload = event<OrderUpdatedEvent>('order.updated', { type: 'order', id: order.id }, order.version, {
    status: order.status,
    transactionHash: order.transactionHash,
    failureReason: order.failureReason,
  })
  for (const connection of connections) {
    if (connection.userId === order.userId) connection.io.client.emit('order.updated', payload)
  }
}

/** Randomly moves the price of one NFT, like market activity on a real server */
function tickPrice() {
  const nfts = Object.values(getDb().nfts)
  const nft = nfts[Math.floor(Math.random() * nfts.length)]
  if (!nft) return
  // Integer per-mille change between -5% and +5%, applied to every edition
  const perMille = 950 + Math.floor(Math.random() * 101)
  for (const edition of nft.editions) edition.price = scaleEth(edition.price, perMille, 1000, 4)
  nft.price = nft.editions.find((e) => e.id === nft.defaultEditionId)?.price ?? nft.price
  nft.version += 1
  commit()
  publishNftUpdated(nft)
}

function syncPriceTicker() {
  const interval = getScenario().priceTickMs
  if (connections.size === 0 || interval === null) {
    if (priceTicker) clearInterval(priceTicker)
    priceTicker = null
    return
  }
  priceTicker ??= setInterval(tickPrice, interval)
}

/** Reads the auth token from the Socket.IO CONNECT packet: `40{"token":"..."}` */
function tokenFromConnectPacket(data: unknown): string | null {
  if (typeof data !== 'string' || !data.startsWith('40')) return null
  try {
    const auth = JSON.parse(data.slice(2)) as { token?: unknown }
    return typeof auth.token === 'string' ? auth.token : null
  } catch {
    return null
  }
}

export const realtimeHandlers = [
  socketLink.addEventListener('connection', (wsConnection) => {
    if (!new URL(wsConnection.client.url).pathname.startsWith(SOCKET_IO_PATH)) {
      // Not a Socket.IO connection: forward it to the real server
      wsConnection.server.connect()
      return
    }

    const connection: Connection = { io: toSocketIo(wsConnection), userId: null }
    connections.add(connection)
    syncPriceTicker()

    wsConnection.client.addEventListener('message', (message) => {
      const token = tokenFromConnectPacket(message.data)
      if (token) connection.userId = userIdFromToken(token)
    })

    // The binding does not send Engine.IO pings; without them socket.io-client
    // drops the connection after pingInterval + pingTimeout (30s).
    const ping = setInterval(() => wsConnection.client.send('2'), PING_INTERVAL_MS)

    wsConnection.client.addEventListener('close', () => {
      clearInterval(ping)
      connections.delete(connection)
      syncPriceTicker()
    })
  }),
]
