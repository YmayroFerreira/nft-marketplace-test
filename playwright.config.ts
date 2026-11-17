import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

/**
 * E2E and visual regression tests.
 *
 * They run against the production build (`vite build` + `vite preview`) with
 * the MSW mock API enabled, like the demo deploy. Each test gets a fresh
 * browser context, so the mock database starts from the seed every time.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Small tolerance for font anti-aliasing differences
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // Vite is called through node directly: on Windows the npm path has spaces
    // ("C:\Program Files\...") and breaks the shell command
    command: `node ./node_modules/vite/bin/vite.js build && node ./node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
