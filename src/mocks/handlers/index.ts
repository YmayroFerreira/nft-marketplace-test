import { realtimeHandlers } from '../realtime'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'
import { catalogHandlers } from './catalog'
import { contentHandlers } from './content'
import { favoritesHandlers } from './favorites'
import { ordersHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletsHandlers } from './wallets'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...contentHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...favoritesHandlers,
  ...ordersHandlers,
  ...walletsHandlers,
  ...profileHandlers,
  ...realtimeHandlers,
]
