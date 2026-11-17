import { expect, test } from '@playwright/test'
import { apiFetch, gotoStable, signIn } from './support/helpers.ts'

test.describe('Compra', () => {
  test('detalhe → carrinho → pagamento → confirmação ao vivo', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await signIn(page)

    await page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho/)

    // The demo cart already had 2 editions; 2 more were added
    await expect(page.getByRole('group', { name: 'Edições de Emerald Ape #042' }).locator('output')).toHaveText('4')

    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/pagamento/)
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/pedido\//)
    // Status changes arrive through Socket.IO (order.updated)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  })

  test('cupom e quantidade atualizam o resumo do carrinho', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)

    const total = page.getByText('Total estimado').locator('..')
    await expect(total).toContainText('26.846 ETH')

    await page.getByLabel('Código promocional').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(total).toContainText('24.163 ETH')

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).click()
    await expect(page.getByText('Violet Nomad #314')).toHaveCount(0)
  })

  test('cupom inválido mostra erro', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)
    await page.getByLabel('Código promocional').fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Código promocional inválido.')).toBeVisible()
  })

  test('clique duplo em "Confirmar compra" cria um único pedido (idempotência)', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'slow')
    await signIn(page)
    const confirm = page.getByRole('button', { name: 'Confirmar compra' })
    await confirm.dblclick()
    await expect(page).toHaveURL(/\/pedido\//, { timeout: 20_000 })

    const orders = await apiFetch<unknown[]>(page, '/api/orders')
    expect(orders.data).toHaveLength(1)
  })

  test('mesma Idempotency-Key devolve o mesmo pedido', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const cart = await apiFetch<{ version: number }>(page, '/api/cart')
    const wallets = await apiFetch<{ id: string }[]>(page, '/api/wallets')
    const body = { walletId: wallets.data[0].id, cartVersion: cart.data.version }
    const headers = { 'Idempotency-Key': 'e2e-key-1' }

    const first = await apiFetch<{ id: string }>(page, '/api/orders', { method: 'POST', body, headers })
    const second = await apiFetch<{ id: string }>(page, '/api/orders', { method: 'POST', body, headers })
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.data.id).toBe(first.data.id)

    const withoutKey = await apiFetch(page, '/api/orders', { method: 'POST', body })
    expect(withoutKey.status).toBe(400)
  })

  test('pagamento recusado devolve os itens ao carrinho', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'checkout-fails')
    await signIn(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('heading', { name: 'Não foi possível concluir a compra' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(3)
  })

  test('o estoque do NFT diminui ao vivo depois de uma compra (nft.updated)', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await signIn(page)
    await expect(page.getByText('50 de 50 edições disponíveis')).toBeVisible()

    // Buys the demo cart (2 editions of Emerald Ape) through the API, without leaving the page
    const cart = await apiFetch<{ version: number }>(page, '/api/cart')
    const wallets = await apiFetch<{ id: string }[]>(page, '/api/wallets')
    await apiFetch(page, '/api/orders', {
      method: 'POST',
      body: { walletId: wallets.data[0].id, cartVersion: cart.data.version },
      headers: { 'Idempotency-Key': 'e2e-stock' },
    })

    await expect(page.getByText('48 de 50 edições disponíveis')).toBeVisible({ timeout: 15_000 })
  })
})
