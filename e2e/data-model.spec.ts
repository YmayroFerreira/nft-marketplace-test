import { expect, test } from '@playwright/test'
import { apiFetch, gotoStable, signIn } from './support/helpers.ts'

test.describe('Edições', () => {
  test('cada edição tem preço e estoque próprios; edição esgotada fica indisponível', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    // Default edition (1/50) shows the Figma price
    await expect(page.getByText('50 de 50 disponíveis na edição 1/50')).toBeVisible()
    await expect(page.getByText('1.19 ETH').filter({ visible: true }).first()).toBeVisible()

    // 1/10 costs 1.8× the base price, computed exactly: 1.19 × 1.8 = 2.142
    await page.getByText('1/10', { exact: true }).click()
    await expect(page.getByText('2.142 ETH').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('10 de 10 disponíveis na edição 1/10')).toBeVisible()

    // 1/1 of this NFT is sold out in the seed data
    await expect(page.getByRole('radio', { name: '1/1 (indisponível)' })).toBeDisabled()
  })

  test('a quantidade é limitada pelo estoque da edição', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await page.getByText('1/10', { exact: true }).click()
    const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' })
    const plus = stepper.getByRole('button', { name: 'Aumentar quantidade' })
    for (let i = 0; i < 12; i++) if (await plus.isEnabled()) await plus.click()
    await expect(stepper.locator('output')).toHaveText('10')
    await expect(plus).toBeDisabled()
  })

  test('a mesma NFT em edições diferentes vira linhas separadas no carrinho', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await signIn(page)
    await page.getByText('1/10', { exact: true }).click()
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho/)
    await expect(page.getByRole('group', { name: 'Edições de Emerald Ape #042 (1/10)' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Edições de Emerald Ape #042 (1/50)' })).toBeVisible()
  })

  test('a API recusa quantidade acima do estoque da edição', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const response = await apiFetch<{ error: { code: string } }>(page, '/api/cart/items/emerald-ape-042/1-1', {
      method: 'PUT',
      body: { quantity: 1 },
    })
    expect(response.status).toBe(409)
    expect(response.data.error.code).toBe('insufficient_editions')
  })
})

test.describe('Valores em ETH', () => {
  test('a API envia valores como strings decimais', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const cart = await apiFetch<Record<string, unknown>>(page, '/api/cart')
    for (const field of ['subtotal', 'discount', 'networkFee', 'total']) {
      expect(typeof cart.data[field], field).toBe('string')
    }
    expect(cart.data.subtotal).toBe('26.83')
    expect(cart.data.total).toBe('26.846')

    const list = await apiFetch<{ items: { price: unknown }[] }>(page, '/api/nfts?pageSize=3')
    expect(list.data.items.every((nft) => typeof nft.price === 'string')).toBe(true)
  })
})

test.describe('Cupom', () => {
  test('cupom expirado mostra erro específico', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)
    await page.getByLabel('Código promocional').fill('LANCAMENTO2025')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este código promocional expirou.')).toBeVisible()
  })
})

test.describe('Senhas', () => {
  test('senhas nunca são guardadas em texto puro', async ({ page }) => {
    await gotoStable(page, '/?auth=criar-conta')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome de usuário').fill('testehash')
    await dialog.getByLabel('E-mail').fill('hash@kurio.dev')
    await dialog.getByLabel('Senha', { exact: true }).fill('SenhaSecreta987')
    await dialog.getByLabel('Confirmar senha').fill('SenhaSecreta987')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog).toBeHidden()

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))
    expect(storage).not.toContain('SenhaSecreta987')
    expect(storage).not.toContain('kurio1234')
    expect(storage).toContain('PBKDF2-SHA256')
  })
})
