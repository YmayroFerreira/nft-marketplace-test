import { expect, test } from '@playwright/test'
import { SECOND_USER, apiFetch, apiPlaceOrder, gotoStable, reviewCheckout, signIn } from './support/helpers.ts'

test.describe('Troca de usuário', () => {
  test('a segunda conta não vê favoritos, perfil nem pedidos da anterior', async ({ page }) => {
    await gotoStable(page, '/favoritos')
    await signIn(page)
    await expect(page.getByRole('heading', { name: 'Neon Vessel #552' })).toBeVisible()
    const { order } = await apiPlaceOrder(page, 'troca-de-usuario')
    expect(order.status).toBe(201)

    // Everything below stays in the same page load, so stale caches would show up
    const footer = page.locator('footer')
    await footer.getByRole('link', { name: 'Meu perfil' }).click()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)

    await page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).click()
    await expect(page).toHaveURL(/auth=/)
    await signIn(page, SECOND_USER.email, SECOND_USER.password)

    await footer.getByRole('link', { name: 'Lista de interesse' }).click()
    await expect(page.getByRole('heading', { name: 'Golden Beat #207' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Neon Vessel #552' })).toHaveCount(0)

    await footer.getByRole('link', { name: 'Meu perfil' }).click()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(SECOND_USER.displayName)

    const otherOrder = await apiFetch(page, `/api/orders/${order.data.id}`)
    expect(otherOrder.status).toBe(404)
    await page.goto(`/pedido/${order.data.id}`)
    await expect(page.getByText('Pedido não encontrado.')).toBeVisible()
  })
})

test.describe('Idempotência do pedido', () => {
  test('a mesma chave com outros dados gera conflito', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const { order, body } = await apiPlaceOrder(page, 'chave-com-conflito')
    expect(order.status).toBe(201)

    const conflict = await apiFetch<{ error: { code: string } }>(page, '/api/orders', {
      method: 'POST',
      body: { ...body, collector: { ...body.collector, fullName: 'Outra Pessoa' } },
      headers: { 'Idempotency-Key': 'chave-com-conflito' },
    })
    expect(conflict.status).toBe(409)
    expect(conflict.data.error.code).toBe('idempotency_conflict')
  })

  test('timeout depois de criar o pedido recupera o mesmo pedido ao tentar de novo', async ({ page }) => {
    // Waits for the real 15 s timeout of the API client
    test.setTimeout(60_000)
    await gotoStable(page, '/pagamento', 'order-timeout')
    await signIn(page)
    await reviewCheckout(page)

    const confirm = page.getByRole('button', { name: 'Confirmar compra' })
    await confirm.click()
    await expect(page.getByRole('alert').filter({ hasText: 'demorou demais' })).toBeVisible({ timeout: 20_000 })

    await confirm.click()
    await expect(page).toHaveURL(/\/pedido\//)
    const orders = await apiFetch<unknown[]>(page, '/api/orders')
    expect(orders.data).toHaveLength(1)
  })
})
