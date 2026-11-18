import { expect, test, type Page } from '@playwright/test'
import { gotoStable, signIn } from './support/helpers.ts'

/**
 * Visual regression. Baselines live in e2e/__screenshots__ and are versioned.
 * The `stable` scenario keeps data and timing fixed; update baselines with
 * `npm run test:e2e:update`.
 */

/** Waits for images and fonts so the screenshot is stable */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    // Load lazy images by scrolling through the page
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 30))
    }
    window.scrollTo(0, 0)
    // Only visible images: lazy images inside display:none (e.g. the mobile hero
    // on desktop) never load
    const pending = Array.from(document.images).filter((img) => !img.complete && img.checkVisibility())
    await Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
            setTimeout(resolve, 5000)
          }),
      ),
    )
  })
  // The footer code loads after the first paint
  await expect(page.locator('footer')).toBeVisible()
  // Toasts are transient: keep them out of the screenshots
  await page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important}' })
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await gotoStable(page, '/')
    await expect(page.locator('#catalogo article')).toHaveCount(9)
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe do NFT', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('modal de login', async ({ page }) => {
    await gotoStable(page, '/?auth=entrar')
    await expect(page.getByRole('dialog')).toBeVisible()
    await settle(page)
    await expect(page.getByRole('dialog')).toHaveScreenshot('login.png')
  })

  test('carrinho', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)
    await expect(page.getByRole('group', { name: /^Edições de / }).first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await expect(page.getByRole('radio').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
