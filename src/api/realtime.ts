import { io, type Socket } from 'socket.io-client'
import type { RealtimeEventMap } from '@/types/realtime'
import { getSessionToken, onSessionTokenChange } from './session-token'

type ServerToClientEvents = {
  [K in keyof RealtimeEventMap]: (event: RealtimeEventMap[K]) => void
}

export type RealtimeSocket = Socket<ServerToClientEvents>

let socket: RealtimeSocket | null = null

/**
 * Shared Socket.IO connection. The session token goes in the handshake so the
 * server only sends `order.updated` events to the order owner; when the user
 * signs in or out the socket reconnects with the new token.
 */
export function getRealtimeSocket(): RealtimeSocket {
  if (socket) return socket

  socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    path: '/socket.io',
    // The MSW Socket.IO binding only supports the WebSocket transport
    transports: ['websocket'],
    auth: (callback) => callback({ token: getSessionToken() }),
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  })

  onSessionTokenChange(() => {
    if (!socket) return
    socket.disconnect()
    socket.connect()
  })

  return socket
}
