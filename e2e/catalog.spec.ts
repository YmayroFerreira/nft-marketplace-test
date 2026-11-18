import { expect, test } from '@playwright/test'
import { catalogCards, gotoStable, isMobile } from './support/helpers.ts'

test.describe('Catálogo', () => {
  test('lista os NFTs da API com paginação na URL', async ({ page }) => {
    await gotoStable(page, '/')
    await expect(catalogCards(page)).toHaveCount(9)
    await expect(catalogCards(page).first()).toContainText('Emerald Ape #042')

    await page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(catalogCards(page).first()).not.toContainText('Emerald Ape #042')
    await expect(
      page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: 'Página 2' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('filtra por coleção e o filtro sobrevive ao recarregar', async ({ page }) => {
    await gotoStable(page, '/')
    if (isMobile(page)) {
      await page.getByRole('button', { name: 'Abrir filtros' }).click()
      await page.getByRole('dialog').getByRole('button', { name: /^Música/ }).click()
      await page.keyboard.press('Escape')
    } else {
      await page.getByRole('region', { name: 'Filtros' }).getByRole('button', { name: /^Música/ }).click()
    }

    await expect(page).toHaveURL(/collections=/)
    await expect(catalogCards(page)).toHaveCount(6)
    await page.reload()
    await expect(catalogCards(page)).toHaveCount(6)
  })

  test('ordena por menor preço', async ({ page }) => {
    await gotoStable(page, '/?sort=price-asc')
    const prices = await catalogCards(page).locator('p > span:first-child').allInnerTexts()
    const values = prices.map((p) => Number.parseFloat(p))
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })

  test('mostra o estado vazio no cenário "empty"', async ({ page }) => {
    await gotoStable(page, '/', 'empty')
    await expect(page.getByText('Nenhum NFT encontrado com esses filtros.')).toBeVisible()
  })

  test('mostra erro com "Tentar novamente" no cenário "catalog-error"', async ({ page }) => {
    await gotoStable(page, '/', 'catalog-error')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Não foi possível carregar o catálogo.', { timeout: 20_000 })
    await expect(alert.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  test('abre o detalhe do NFT', async ({ page }) => {
    await gotoStable(page, '/')
    await catalogCards(page).first().getByRole('link', { name: /Emerald Ape #042/ }).first().click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('50 de 50 disponíveis na edição 1/50')).toBeVisible()
  })

  test('detalhe inexistente mostra mensagem de não encontrado', async ({ page }) => {
    await gotoStable(page, '/nft/nao-existe')
    await expect(page.getByRole('alert')).toContainText('Este NFT não existe ou foi removido.')
  })
})
