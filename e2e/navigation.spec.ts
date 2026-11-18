import { expect, test } from '@playwright/test'
import { apiFetch, apiPlaceOrder, catalogCards, gotoStable, isMobile, signIn } from './support/helpers.ts'

test.describe('Histórico do navegador', () => {
  test('voltar e avançar percorrem os filtros do catálogo', async ({ page }) => {
    await gotoStable(page, '/')
    const pagination = page.getByRole('navigation', { name: 'Paginação' })

    await pagination.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await page.getByRole('button', { name: 'Em alta' }).click()
    // A filter change goes back to page 1
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page).not.toHaveURL(/page=/)

    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(page).not.toHaveURL(/tab=/)
    await expect(pagination.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    await page.goBack()
    await expect(page).not.toHaveURL(/page=/)
    await expect(catalogCards(page).first()).toContainText('Emerald Ape #042')

    await page.goForward()
    await expect(page).toHaveURL(/page=2/)
  })
})

test.describe('Busca', () => {
  test('a lupa do Header busca no catálogo (desktop)', async ({ page }) => {
    test.skip(isMobile(page), 'No mobile a busca fica no topo da Início')
    await gotoStable(page, '/nft/emerald-ape-042')
    await page.locator('header').getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.locator('header').getByRole('searchbox').fill('golden')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/q=golden/)
    await expect(page.getByText(/Resultados para/)).toContainText('golden')
    for (const name of await catalogCards(page).locator('h3').allInnerTexts()) {
      expect(name.toLowerCase()).toContain('golden')
    }

    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(page).not.toHaveURL(/q=/)
  })

  test('Esc fecha a busca do Header e devolve o foco à lupa (desktop)', async ({ page }) => {
    test.skip(isMobile(page), 'No mobile a busca fica no topo da Início')
    await gotoStable(page, '/')
    await page.locator('header').getByRole('button', { name: 'Buscar NFTs' }).click()
    await expect(page.locator('header').getByRole('searchbox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('header').getByRole('button', { name: 'Buscar NFTs' })).toBeFocused()
  })
})

test.describe('Carteiras', () => {
  test('editar o apelido e o ENS de uma carteira', async ({ page }) => {
    await gotoStable(page, '/carteiras')
    await signIn(page)
    await page.getByRole('button', { name: 'Editar carteira Principal' }).click()
    const form = page.getByRole('form', { name: 'Editar carteira Principal' })

    await form.getByLabel(/Nome ENS/).fill('nome inválido!')
    await form.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(form.getByText('O nome ENS precisa terminar em .eth.')).toBeVisible()

    await form.getByLabel(/Apelido da carteira/).fill('Cofre principal')
    await form.getByLabel(/Nome ENS/).fill('cofre.kurio')
    await form.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Carteira Cofre principal atualizada.')).toBeVisible()

    await page.reload()
    const primary = page.getByRole('region', { name: 'Carteira principal' })
    await expect(primary.getByText('Cofre principal')).toBeVisible()
    await expect(primary.getByText('cofre.kurio.eth')).toBeVisible()
  })
})

test.describe('Sessão no checkout', () => {
  test('sessão que expira no pagamento abre o login e mantém os dados preenchidos', async ({ page }) => {
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await page.getByLabel(/Telefone/).fill('11 99999-0000')

    // The server drops the session; the page still holds the (now invalid) token
    await apiFetch(page, '/api/auth/sign-out', { method: 'POST' })
    await page.getByRole('button', { name: 'Conectar carteira' }).click()

    await expect(page.getByText(/Sua sessão expirou/)).toBeVisible()
    await signIn(page)

    await expect(page).toHaveURL(/\/pagamento/)
    await expect(page.getByText(/Recuperamos os dados que você tinha preenchido/)).toBeVisible()
    await expect(page.getByLabel(/Telefone/)).toHaveValue('11 99999-0000')
  })
})

test.describe('Explorador simulado', () => {
  test('o recibo leva ao explorador simulado da transação', async ({ page }) => {
    await gotoStable(page, '/')
    await signIn(page)
    const { order } = await apiPlaceOrder(page, 'e2e-explorer')

    await page.goto(`/pedido/${order.data.id}`)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('link', { name: 'Ver no explorador (simulado)' }).click()

    await expect(page).toHaveURL(/\/explorador\/tx\/0x/)
    await expect(page.getByRole('note')).toContainText('Explorador simulado')
    await expect(page.getByText('Sucesso')).toBeVisible()
    await expect(page.getByText('Emerald Ape #042 · ID #0042 · Edição 1/50 · 2 cópias')).toBeVisible()
    // Public page: no buyer data
    await expect(page.getByText('colecionador@kurio.dev')).toHaveCount(0)
  })

  test('transação inexistente mostra "não encontrada"', async ({ page }) => {
    await gotoStable(page, '/explorador/tx/0xdeadbeef')
    await expect(page.getByRole('alert')).toContainText('Transação não encontrada.')
  })
})
