import { expect, test } from '@playwright/test'
import { DEMO_USER, apiFetch, apiPlaceOrder, gotoStable, reviewCheckout, signIn } from './support/helpers.ts'

type CartLine = { nftId: string; editionId: string; quantity: number }

test.describe('Carrinho do visitante', () => {
  test('visitante adiciona ao carrinho, o carrinho sobrevive ao F5 e é mesclado ao entrar', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho/)

    // Values come from the API even without an account
    await expect(page.getByRole('group', { name: 'Edições de Emerald Ape #042 (1/50)' }).locator('output')).toHaveText('1')
    await expect(page.getByText('Total estimado').locator('..')).toContainText('1.206 ETH')

    await page.reload()
    await expect(page.getByRole('group', { name: 'Edições de Emerald Ape #042 (1/50)' }).locator('output')).toHaveText('1')

    // Checkout needs an account: sign in, the cart is merged, and checkout continues
    await page.getByRole('button', { name: 'Entrar e finalizar' }).click()
    await expect(page).toHaveURL(/auth=/)
    await signIn(page)
    await expect(page).toHaveURL(/\/pagamento/)
    await expect(page.getByText('Os itens do seu carrinho foram adicionados à sua conta.')).toBeVisible()

    const cart = await apiFetch<{ items: CartLine[] }>(page, '/api/cart')
    // Demo account already had 2 copies of Emerald Ape 1/50: 2 + 1 = 3
    expect(cart.data.items.find((i) => i.nftId === 'emerald-ape-042')?.quantity).toBe(3)
    expect(cart.data.items).toHaveLength(3)
  })

  test('cupom inválido no carrinho do visitante mostra erro', async ({ page }) => {
    await gotoStable(page, '/nft/golden-beat-207')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho/)
    await page.getByLabel('Código promocional').fill('LANCAMENTO2025')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este código promocional expirou.')).toBeVisible()

    await page.getByLabel('Código promocional').fill('GENESIS')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('GENESIS')).toBeVisible()
  })
})

test.describe('Pagamento', () => {
  test('valida os dados do colecionador antes da revisão', async ({ page }) => {
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await page.getByLabel(/Nome completo/).fill('Nova')
    await page.getByLabel(/E-mail para o recibo/).fill('email-invalido')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()

    await expect(page.getByText('Informe nome e sobrenome.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByText('Conecte a carteira para continuar.')).toBeVisible()
    await expect(page.getByLabel(/Nome completo/)).toBeFocused()
  })

  test('trocar a rede exige conectar a carteira de novo', async ({ page }) => {
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('Conectada em Ethereum')).toBeVisible()

    await page.getByLabel('Rede', { exact: true }).selectOption('polygon')
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('Conectada em Polygon')).toBeVisible()
  })

  test('carteira que recusa a conexão mostra o erro', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'wallet-rejects')
    await signIn(page)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('A conexão foi recusada na carteira. Tente novamente.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeEnabled()
  })

  test('carteira desconectada no envio volta para a etapa de dados', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'wallet-disconnects')
    await signIn(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('A carteira foi desconectada. Conecte novamente para confirmar.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
  })

  test('preço que muda antes da confirmação exige nova confirmação', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'quote-changes')
    await signIn(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    // The API refused the old quote and sent the new values
    await expect(page.getByText(/Os valores mudaram desde a revisão/)).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento/)
    await page.getByRole('button', { name: 'Confirmar com os novos valores' }).click()
    await expect(page).toHaveURL(/\/pedido\//)
  })
})

test.describe('Pedido', () => {
  test('após confirmar, só os itens comprados saem do carrinho', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const { order } = await apiPlaceOrder(page, 'e2e-only-purchased')
    expect(order.status).toBe(201)

    // Added while the order is being processed: must stay in the cart
    await apiFetch(page, '/api/cart/items/golden-beat-207/1-50', { method: 'PUT', body: { quantity: 1 } })

    await page.goto(`/pedido/${order.data.id}`)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({
      timeout: 15_000,
    })
    const cart = await apiFetch<{ items: CartLine[] }>(page, '/api/cart')
    expect(cart.data.items).toEqual([expect.objectContaining({ nftId: 'golden-beat-207', editionId: '1-50', quantity: 1 })])
  })

  test('um segundo pedido enquanto outro está em andamento é recusado', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    await apiPlaceOrder(page, 'e2e-first')
    const { order: second } = await apiPlaceOrder(page, 'e2e-second')
    expect(second.status).toBe(409)
    expect(second.data.error?.code).toBe('order_in_progress')
  })

  test('o recibo reproduz os valores da cotação confirmada', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const quote = await apiFetch<{ total: string; items: unknown[] }>(page, '/api/checkout/quote', { method: 'POST' })
    const { order } = await apiPlaceOrder(page, 'e2e-snapshot')
    const receipt = await apiFetch<{ total: string; items: unknown[]; collector: { email: string } }>(
      page,
      `/api/orders/${order.data.id}`,
    )
    expect(receipt.data.total).toBe(quote.data.total)
    expect(receipt.data.items).toEqual(quote.data.items)
    expect(receipt.data.collector.email).toBe(DEMO_USER.email)
  })
})
