/**
 * Mock scenarios change how the whole fake API behaves, so failure and edge
 * cases can be shown (and tested) without touching the app code.
 *
 * Select one with `?scenario=<name>` in the URL; it is remembered until another
 * one is chosen. `?scenario=default` goes back to normal.
 */
export interface Scenario {
  label: string
  /** Response delay range in ms */
  latency: [number, number]
  /** Catalog endpoints return no NFTs */
  emptyCatalog?: boolean
  /** Catalog endpoints fail with 500 */
  catalogError?: boolean
  /** Orders end as `failed` instead of `confirmed` */
  checkoutFails?: boolean
  /** Probability (0-1) of any request failing with 503 */
  failureRate?: number
  /** Authenticated endpoints answer 401, as if the session expired */
  sessionExpired?: boolean
  /** Interval of the simulated `nft.updated` price changes; null disables them */
  priceTickMs: number | null
  /** Favorite toggles fail, to show the optimistic update rollback */
  favoritesFail?: boolean
  /** The wallet refuses the connection request */
  walletRejects?: boolean
  /** The wallet disconnects right when the purchase is confirmed */
  walletDisconnects?: boolean
  /** A price changes between the review and the confirmation */
  quoteChanges?: boolean
}

export const SCENARIOS = {
  default: { label: 'Padrão', latency: [250, 700], priceTickMs: 15_000 },
  /** Fixed data and timing for Playwright and Lighthouse: no random failures, no price ticks */
  stable: { label: 'Estável (testes)', latency: [0, 0], priceTickMs: null },
  /** No price ticks: long flows here must stay deterministic (tests use it) */
  slow: { label: 'Rede lenta', latency: [2000, 3500], priceTickMs: null },
  empty: { label: 'Catálogo vazio', latency: [250, 700], emptyCatalog: true, priceTickMs: null },
  'catalog-error': { label: 'Erro no catálogo', latency: [250, 700], catalogError: true, priceTickMs: null },
  'checkout-fails': { label: 'Pagamento falha', latency: [250, 700], checkoutFails: true, priceTickMs: 15_000 },
  flaky: { label: 'Instável (20% de falhas)', latency: [250, 900], failureRate: 0.2, priceTickMs: 15_000 },
  'session-expired': { label: 'Sessão expirada', latency: [250, 700], sessionExpired: true, priceTickMs: null },
  'favorites-fail': { label: 'Favoritar falha', latency: [600, 900], favoritesFail: true, priceTickMs: null },
  live: { label: 'Tempo real acelerado', latency: [250, 700], priceTickMs: 3_000 },
  'wallet-rejects': { label: 'Carteira recusa conexão', latency: [250, 700], walletRejects: true, priceTickMs: null },
  'wallet-disconnects': { label: 'Carteira desconecta no envio', latency: [250, 700], walletDisconnects: true, priceTickMs: null },
  'quote-changes': { label: 'Preço muda antes de confirmar', latency: [0, 0], quoteChanges: true, priceTickMs: null },
} satisfies Record<string, Scenario>

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio.mock.scenario'

function isScenarioName(value: string | null): value is ScenarioName {
  return value !== null && value in SCENARIOS
}

let current: ScenarioName = 'default'

/** Reads `?scenario=` (or the remembered choice) once, when the mocks start */
export function initScenario() {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: use the URL or the default
  }

  if (isScenarioName(fromUrl)) {
    current = fromUrl
    try {
      localStorage.setItem(STORAGE_KEY, fromUrl)
    } catch {
      // Not persisted; still applies to this page load
    }
  } else if (isScenarioName(stored)) {
    current = stored
  }
  return current
}

export function getScenarioName() {
  return current
}

export function getScenario(): Scenario {
  return SCENARIOS[current]
}
