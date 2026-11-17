import { setupWorker } from 'msw/browser'
import { resetDb } from './db'
import { handlers } from './handlers'
import { resumePendingOrders } from './handlers/orders'
import { getScenario, initScenario } from './scenarios'

/**
 * Starts the mock API. URL options:
 * - `?scenario=<name>` picks a scenario (see scenarios.ts); it is remembered
 * - `?mockReset` restores the seed data (users, carts, orders...)
 */
export async function startMockApi() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('mockReset')) {
    resetDb()
    // Drop the flag so a refresh does not reset again
    params.delete('mockReset')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  }

  const scenario = initScenario()

  const worker = setupWorker(...handlers)
  await worker.start({
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest(request, print) {
      // Only warn about API calls without a handler; assets go to the network
      if (new URL(request.url).pathname.startsWith('/api')) print.warning()
    },
  })

  resumePendingOrders()
  if (!import.meta.env.PROD) {
    console.info(`[mock api] cenário: ${scenario} (${getScenario().label})`)
  }
}
