import { expect, test, type Page } from '@playwright/test'
import { apiFetch, apiPlaceOrder, gotoStable, reviewCheckout, signIn } from './support/helpers.ts'

type NftEvent = { eventId: string; version: number; data: { price: string } }

/** Waits for socket.io-client to be connected to the simulated server */
async function waitForSocket(page: Page, kind: 'connected' | 'authenticated' = 'connected') {
  await expect
    .poll(async () => (await apiFetch<Record<string, number>>(page, '/api/__mock/socket')).data[kind])
    .toBeGreaterThan(0)
}

async function changeNft(page: Page, id: string, body: { price?: string; available?: number }) {
  return (await apiFetch<NftEvent>(page, `/api/__mock/nfts/${id}`, { method: 'POST', body })).data
}

const emit = (page: Page, event: unknown) => apiFetch(page, '/api/__mock/socket/emit', { method: 'POST', body: event })
const setOffline = (page: Page, offline: boolean) =>
  apiFetch(page, '/api/__mock/socket/offline', { method: 'POST', body: { offline } })
const catalogCard = (page: Page, name: string) => page.locator('#catalogo article').filter({ hasText: name })
const CHANGE_NOTICE = /Emerald Ape #042: o preço ou a disponibilidade mudou/

async function buyThroughCheckout(page: Page) {
  await gotoStable(page, '/pagamento')
  await signIn(page)
  await reviewCheckout(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedido\//)
  await waitForSocket(page, 'authenticated')
}

test.describe('Tempo real no carrinho e no checkout', () => {
  test('preço alterado no checkout avisa e exige nova confirmação', async ({ page }) => {
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await reviewCheckout(page)
    await waitForSocket(page, 'authenticated')

    await changeNft(page, 'emerald-ape-042', { price: '2.50' })
    await expect(page.getByText(CHANGE_NOTICE)).toBeVisible()

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText(/Os valores mudaram desde a revisão/)).toBeVisible()
    expect((await apiFetch<unknown[]>(page, '/api/orders')).data).toHaveLength(0)

    await page.getByRole('button', { name: 'Confirmar com os novos valores' }).click()
    await expect(page).toHaveURL(/\/pedido\//)
  })

  test('carrinho aberto atualiza o resumo quando o preço muda', async ({ page }) => {
    await gotoStable(page, '/carrinho')
    await signIn(page)
    await waitForSocket(page, 'authenticated')
    await expect(page.getByText('2.38 ETH').filter({ visible: true }).first()).toBeVisible()

    await changeNft(page, 'emerald-ape-042', { price: '2.50' })
    await expect(page.getByText(CHANGE_NOTICE)).toBeVisible()
    await expect(page.getByText('5.00 ETH').filter({ visible: true }).first()).toBeVisible()
  })

  test('carrinho do visitante também acompanha a mudança', async ({ page }) => {
    await gotoStable(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho/)
    await waitForSocket(page)

    await changeNft(page, 'emerald-ape-042', { price: '2.50' })
    await expect(page.getByText(CHANGE_NOTICE)).toBeVisible()
    await expect(page.getByText('2.50 ETH').filter({ visible: true }).first()).toBeVisible()
  })
})

test.describe('Eventos duplicados, antigos e reconexão', () => {
  test('ignora eventos duplicados e antigos do catálogo', async ({ page }) => {
    await gotoStable(page, '/')
    await waitForSocket(page)
    const emerald = catalogCard(page, 'Emerald Ape #042')
    const event = await changeNft(page, 'emerald-ape-042', { price: '2.50' })
    await expect(emerald).toContainText('2.50 ETH')

    await emit(page, { ...event, eventId: 'evento-antigo', version: event.version - 1, data: { ...event.data, price: '9.99' } })
    await emit(page, { ...event, version: event.version + 1, data: { ...event.data, price: '8.88' } })

    // Events arrive in order: once this one is applied, the two above were handled
    await changeNft(page, 'sage-nomad-009', { price: '3.33' })
    await expect(catalogCard(page, 'Sage Nomad #009')).toContainText('3.33 ETH')
    await expect(emerald).toContainText('2.50 ETH')
  })

  test('pedido confirmado não volta atrás com um evento posterior', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const { order } = await apiPlaceOrder(page, 'pedido-terminal')
    await page.goto(`/pedido/${order.data.id}`)
    const confirmed = page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })
    await expect(confirmed).toBeVisible()
    await waitForSocket(page, 'authenticated')

    await emit(page, {
      eventId: 'evento-depois-do-fim',
      type: 'order.updated',
      resource: { type: 'order', id: order.data.id },
      version: 99,
      occurredAt: new Date().toISOString(),
      data: { status: 'pending', transactionHash: null, failureReason: null },
    })
    await page.waitForTimeout(300)
    await expect(confirmed).toBeVisible()
  })

  test('ao reconectar, busca na API o que mudou enquanto estava sem conexão', async ({ page }) => {
    await gotoStable(page, '/')
    await waitForSocket(page)
    await setOffline(page, true)
    await expect.poll(async () => (await apiFetch<{ connected: number }>(page, '/api/__mock/socket')).data.connected).toBe(0)

    await changeNft(page, 'emerald-ape-042', { price: '2.50' })
    const emerald = catalogCard(page, 'Emerald Ape #042')
    await expect(emerald).toContainText('1.19 ETH')

    await setOffline(page, false)
    await expect(emerald).toContainText('2.50 ETH')
  })

  test('pedido pendente termina mesmo com o socket desconectado', async ({ page }) => {
    await buyThroughCheckout(page)
    await setOffline(page, true)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect((await apiFetch<unknown[]>(page, '/api/orders')).data).toHaveLength(1)
  })

  test('recarregar a página retoma o pedido pendente sem criar outro', async ({ page }) => {
    await buyThroughCheckout(page)
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect((await apiFetch<unknown[]>(page, '/api/orders')).data).toHaveLength(1)
  })
})

test.describe('Relógio controlado', () => {
  test('cotação expirada exige nova confirmação', async ({ page }) => {
    await page.clock.install()
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await reviewCheckout(page)

    // Quotes last 5 minutes
    await page.clock.fastForward('06:00')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText(/Sua cotação foi atualizada e o total continua/)).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar com os novos valores' }).click()
    await expect(page).toHaveURL(/\/pedido\//)
  })
})
