import { expect, type Page } from '@playwright/test'

/** Fictitious demo account seeded by the mock API */
export const DEMO_USER = { email: 'colecionador@kurio.dev', password: 'kurio1234', firstName: 'Nova' }

/**
 * Opens a page with the `stable` mock scenario: no latency jitter, no random
 * failures and no price ticks, so assertions and screenshots are deterministic.
 */
export async function gotoStable(page: Page, path: string, scenario = 'stable') {
  const separator = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${separator}scenario=${scenario}`)
  await waitForApp(page)
}

/** Waits until React rendered (the mocks start before the app) */
export async function waitForApp(page: Page) {
  await expect(page.locator('#conteudo')).toBeVisible()
}

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 768
}

/** Signs in through the auth dialog, like a user */
export async function signIn(page: Page, email = DEMO_USER.email, password = DEMO_USER.password) {
  const dialog = page.getByRole('dialog')
  if (!(await dialog.isVisible())) {
    const url = new URL(page.url())
    url.searchParams.set('auth', 'entrar')
    await page.goto(url.pathname + url.search)
  }
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/**
 * Faster sign-in for tests that are not about the login flow: calls the API
 * and stores the token, then reloads so the app starts with the session.
 */
export async function signInViaApi(page: Page) {
  const response = await apiFetch<{ token: string }>(page, '/api/auth/sign-in', {
    method: 'POST',
    body: { email: DEMO_USER.email, password: DEMO_USER.password },
  })
  await page.evaluate((token) => localStorage.setItem('kurio.session.token', token), response.data.token)
}

/** Calls the mock API from inside the page (requests go through MSW) */
export async function apiFetch<T>(page: Page, path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return page.evaluate(
    async ({ path, init }) => {
      const token = localStorage.getItem('kurio.session.token')
      const res = await fetch(path, {
        method: init.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      })
      const text = await res.text()
      return { status: res.status, data: (text ? JSON.parse(text) : null) as unknown }
    },
    { path, init },
  ) as Promise<{ status: number; data: T }>
}

export function catalogCards(page: Page) {
  return page.locator('#catalogo article')
}
