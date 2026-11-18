import { expect, test, type Page } from '@playwright/test'
import { DEMO_USER, apiFetch, catalogCards, gotoStable, isMobile, reviewCheckout, signIn } from './support/helpers.ts'

type NftPage = { items: { name: string }[] }

async function toggleFilters(page: Page, names: RegExp[]) {
  if (isMobile(page)) await page.getByRole('button', { name: 'Abrir filtros' }).click()
  const filters = isMobile(page) ? page.getByRole('dialog') : page.getByRole('region', { name: 'Filtros' })
  for (const name of names) await filters.getByRole('button', { name }).click()
  if (isMobile(page)) await page.keyboard.press('Escape')
}

test.describe('Falhas de rede', () => {
  test('sem conexão mostra o erro e "Tentar novamente" recupera o catálogo', async ({ page }) => {
    await gotoStable(page, '/', 'offline')
    const alert = page.getByRole('alert').filter({ hasText: 'Sem conexão com o servidor' })
    await expect(alert).toBeVisible()

    await apiFetch(page, '/api/__mock/network', { method: 'POST', body: { down: false } })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(catalogCards(page)).toHaveCount(9)
  })

  test('resposta antiga que chega depois não substitui o resultado atual', async ({ page }) => {
    await gotoStable(page, '/', 'out-of-order')
    await page.getByRole('group', { name: 'Filtrar catálogo' }).getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)

    const trending = await apiFetch<NftPage>(page, '/api/nfts?tab=trending')
    const recent = await apiFetch<NftPage>(page, '/api/nfts')
    const expected = trending.data.items[0].name
    expect(expected).not.toBe(recent.data.items[0].name)
    await expect(catalogCards(page).first()).toContainText(expected)

    // The first request, for the previous tab, answers after 1.5 s
    await page.waitForTimeout(1800)
    await expect(catalogCards(page).first()).toContainText(expected)
  })

  test('edição que esgota durante a compra impede a confirmação', async ({ page }) => {
    await gotoStable(page, '/pagamento', 'edition-sells-out')
    await signIn(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    const alert = page.getByRole('alert').filter({ hasText: 'A edição 1/50 de Emerald Ape #042 esgotou' })
    await expect(alert).toBeVisible()
    expect((await apiFetch<unknown[]>(page, '/api/orders')).data).toHaveLength(0)
    await alert.getByRole('link', { name: 'Ajustar carrinho' }).click()
    await expect(page).toHaveURL(/\/carrinho/)
  })
})

test.describe('Navegação e catálogo', () => {
  test('rota inexistente mostra a página de não encontrado', async ({ page }) => {
    await gotoStable(page, '/rota-que-nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
    await page.getByRole('main').getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(catalogCards(page)).toHaveCount(9)
  })

  test('filtros combinados reiniciam a paginação e sobrevivem ao recarregar', async ({ page }) => {
    await gotoStable(page, '/?page=2')
    await toggleFilters(page, [/^Música/, /^Ethereum/])
    await expect(page).toHaveURL(/collections=/)
    await expect(page).toHaveURL(/networks=/)
    await expect(page).not.toHaveURL(/page=/)

    const expected = await apiFetch<NftPage>(page, '/api/nfts?collections=music&networks=ethereum')
    const names = expected.data.items.map((nft) => nft.name)
    expect(names.length).toBeGreaterThan(0)
    await expect(catalogCards(page).locator('h3')).toHaveText(names)
    await page.reload()
    await expect(catalogCards(page).locator('h3')).toHaveText(names)
  })

  test('busca pelo campo do mobile', async ({ page }) => {
    test.skip(!isMobile(page), 'No desktop a busca fica no Header')
    await gotoStable(page, '/')
    await page.locator('#mobile-search').fill('Golden')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=Golden/)
    const expected = await apiFetch<NftPage>(page, '/api/nfts?q=Golden')
    await expect(catalogCards(page).locator('h3')).toHaveText(expected.data.items.map((nft) => nft.name))
  })

  test('skeletons animados aparecem no carregamento lento', async ({ page }) => {
    test.setTimeout(75_000)
    const skeleton = page.locator('.skeleton-shimmer:visible').first()
    const expectSkeleton = async () => {
      await expect(skeleton).toBeVisible()
      expect(await skeleton.evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('kurio-shimmer')
    }

    await gotoStable(page, '/', 'slow')
    await expectSkeleton()
    await expect(catalogCards(page)).toHaveCount(9)

    await gotoStable(page, '/nft/emerald-ape-042', 'slow')
    await expectSkeleton()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

    await gotoStable(page, '/carrinho', 'slow')
    await signIn(page)
    await expectSkeleton()
    await expect(page.getByRole('region', { name: 'Itens do carrinho' })).toBeVisible()
  })
})

test.describe('Validação da conta', () => {
  test('cadastro com e-mail já usado mostra o conflito no campo', async ({ page }) => {
    await gotoStable(page, '/?auth=criar-conta')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome de usuário').fill('outraconta')
    await dialog.getByLabel('E-mail').fill(DEMO_USER.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('senha12345')
    await dialog.getByLabel('Confirmar senha').fill('senha12345')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText('Este e-mail já está em uso.').first()).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  test('perfil valida o e-mail e mantém o avatar escolhido', async ({ page }) => {
    await gotoStable(page, '/perfil')
    await signIn(page)
    const save = page.getByRole('button', { name: 'Salvar' }).first()
    const email = page.getByRole('main').getByLabel('E-mail')
    await email.fill('email-invalido')
    await save.click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    await email.fill(DEMO_USER.email)
    await page.getByAltText('Avatar sage-nomad').click()
    await save.click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Avatar sage-nomad' })).toBeChecked()
  })

  test('senha alterada passa a valer no próximo login', async ({ page }) => {
    await gotoStable(page, '/perfil')
    await signIn(page)
    await page.getByLabel('Senha atual').fill(DEMO_USER.password)
    await page.getByLabel('Nova senha', { exact: true }).fill('novasenha123')
    await page.getByLabel('Confirmar nova senha').fill('novasenha123')
    const saved = page.waitForResponse((r) => r.url().includes('/api/profile/password') && r.ok())
    await page.getByRole('button', { name: 'Salvar' }).last().click()
    await saved

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)
    await page.goto('/perfil')
    await signIn(page, DEMO_USER.email, 'novasenha123')
    await expect(page.getByLabel('Nome de exibição')).toBeVisible()
  })
})
