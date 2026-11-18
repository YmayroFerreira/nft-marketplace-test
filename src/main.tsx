import './index.css'

/** The mock API is enabled by configuration (VITE_ENABLE_MOCKS), also in the demo build */
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  // Loaded on demand so the mocks are not part of the main bundle
  const { startMockApi } = await import('./mocks/browser')
  await startMockApi()
}

/**
 * The app runs after the mocks start. Socket.IO is imported later still, on
 * demand: engine.io-client keeps a reference to the global WebSocket when it
 * loads, so it must load after MSW has patched WebSocket.
 */
async function bootstrap() {
  await enableMocking()
  const { renderApp } = await import('./app')
  renderApp(document.getElementById('root')!)
}

void bootstrap()
