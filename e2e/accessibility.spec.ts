import { expect, test } from '@playwright/test'
import { gotoStable, isMobile, signInViaApi } from './support/helpers.ts'

/** Pages and an element that proves the page content (not a skeleton) is on screen */
const PAGES = [
  { path: '/', ready: '#catalogo article', auth: false },
  { path: '/nft/emerald-ape-042', ready: 'h1', auth: false },
  { path: '/carrinho', ready: 'table', auth: true },
  { path: '/pagamento', ready: 'input[type=radio]', auth: true },
  { path: '/favoritos', ready: 'article', auth: true },
  { path: '/perfil', ready: 'form', auth: true },
  { path: '/carteiras', ready: 'article', auth: true },
]

const WIDTHS = [390, 768, 1440]

test.describe('Responsividade e acessibilidade', () => {
  for (const { path, ready, auth } of PAGES) {
    test(`${path}: sem rolagem horizontal em 390/768/1440px e um único h1`, async ({ page }) => {
      // Widths are checked by resizing, so one project is enough
      test.skip(isMobile(page), 'Coberto pelo projeto desktop, que testa as três larguras')

      await gotoStable(page, '/')
      if (auth) await signInViaApi(page)
      await page.goto(path)
      await expect(page.locator(ready).first()).toBeVisible()

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        // Let the layout reflow before measuring
        await page.waitForTimeout(150)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `rolagem horizontal de ${overflow}px em ${width}px`).toBeLessThanOrEqual(0)
        await expect(page.locator('h1:visible'), `h1 visíveis em ${width}px`).toHaveCount(1)
      }
    })
  }

  test('link "Pular para o conteúdo" é o primeiro item do Tab', async ({ page }) => {
    await gotoStable(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
  })

  test('imagens têm texto alternativo (ou são decorativas)', async ({ page }) => {
    await gotoStable(page, '/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    expect(await page.locator('img:not([alt])').count()).toBe(0)
  })

  test('foco fica preso no painel de filtros (mobile)', async ({ page }) => {
    test.skip(!isMobile(page), 'O painel de filtros é só mobile')
    await gotoStable(page, '/')
    const opener = page.getByRole('button', { name: 'Abrir filtros' })
    await opener.click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(opener).toBeFocused()
  })

  test('animação de shimmer respeita "reduzir movimento"', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoStable(page, '/', 'slow')
    const skeleton = page.locator('.skeleton-shimmer:visible').first()
    await expect(skeleton).toBeVisible()
    expect(await skeleton.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  })
})
