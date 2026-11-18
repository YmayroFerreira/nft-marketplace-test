import { expect, test } from '@playwright/test'
import { apiFetch, apiPlaceOrder, gotoStable, reviewCheckout, signIn } from './support/helpers.ts'

test.describe('Compra', () => {
  test('detalhe → carrinho → pagamento → revisão → confirmação ao vivo', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await signIn(page)

    await page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho/)

    // The demo cart already had 2 copies; 2 more were added
    await expect(page.getByRole('group', { name: 'Edições de Emerald Ape #042 (1/50)' }).locator('output')).toHaveText('4')

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/pagamento/)
    await expect(page.getByLabel(/Nome completo/)).toHaveValue('Nova Colecionadora')

    await reviewCheckout(page)
    // The review shows the frozen quote
    await expect(page.getByRole('complementary', { name: 'Valores da cotação' })).toContainText('29.226 ETH')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/pedido\//)
    // Status changes arrive through Socket.IO (order.updated)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Emerald Ape #042')).toBeVisible()
    await expect(page.getByText(/Nova Colecionadora · colecionador@kurio\.dev/)).toBeVisible()
  })

  test('cupom e quantidade atualizam o resumo do carrinho', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)

    const total = page.getByText('Total estimado').locator('..')
    await expect(total).toContainText('26.846 ETH')

    await page.getByLabel('Código promocional').fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(total).toContainText('24.163 ETH')

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 (1/50) do carrinho' }).click()
    await expect(page.getByText('Violet Nomad #314')).toHaveCount(0)
  })

  test('cupom inválido mostra erro ao lado do campo', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)
    await page.getByLabel('Código promocional').fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Código promocional inválido.')).toBeVisible()
    await expect(page.getByLabel('Código promocional')).toHaveAttribute('aria-invalid', 'true')
  })

  test('clique duplo em "Confirmar compra" cria um único pedido (idempotência)', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'slow')
    await signIn(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).dblclick()
    await expect(page).toHaveURL(/\/pedido\//, { timeout: 20_000 })

    const orders = await apiFetch<unknown[]>(page, '/api/orders')
    expect(orders.data).toHaveLength(1)
  })

  test('mesma Idempotency-Key devolve o mesmo pedido; sem chave é recusado', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const { order: first, body } = await apiPlaceOrder(page, 'e2e-key-1')
    expect(first.status).toBe(201)

    const second = await apiFetch<{ id: string }>(page, '/api/orders', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': 'e2e-key-1' },
    })
    expect(second.status).toBe(200)
    expect(second.data.id).toBe(first.data.id)

    const withoutKey = await apiFetch(page, '/api/orders', { method: 'POST', body })
    expect(withoutKey.status).toBe(400)
  })

  test('pagamento recusado preserva os itens no carrinho', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'checkout-fails')
    await signIn(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('heading', { name: 'Não foi possível concluir a compra' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    // One quantity control per cart line, in the desktop table or the mobile cards
    await expect(page.getByRole('group', { name: /^Edições de / })).toHaveCount(3)
  })

  test('o estoque do NFT diminui ao vivo depois de uma compra (nft.updated)', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await signIn(page)
    await expect(page.getByText('50 de 50 disponíveis na edição 1/50')).toBeVisible()

    // Buys the demo cart (2 copies of Emerald Ape 1/50) through the API, without leaving the page
    await apiPlaceOrder(page, 'e2e-stock')

    await expect(page.getByText('48 de 50 disponíveis na edição 1/50')).toBeVisible({ timeout: 15_000 })
  })
})
