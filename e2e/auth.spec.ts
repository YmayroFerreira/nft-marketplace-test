import { expect, test } from '@playwright/test'
import { DEMO_USER, gotoStable, isMobile, signIn } from './support/helpers.ts'

test.describe('Autenticação', () => {
  test('ação protegida abre o login e é concluída depois de entrar', async ({ page }) => {
    await gotoStable(page, '/')
    const favorite = page.getByRole('button', { name: 'Favoritar Sage Nomad #009' })
    if (!isMobile(page)) await page.locator('#catalogo article', { hasText: 'Sage Nomad #009' }).hover()
    await favorite.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/auth=entrar/)

    await signIn(page)
    // The favorite the user tried before signing in is applied
    await expect(page.getByRole('button', { name: 'Remover Sage Nomad #009 dos favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('senha errada mostra a mensagem da API', async ({ page }) => {
    await gotoStable(page, '/?auth=entrar')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(DEMO_USER.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('status')).toHaveText('E-mail ou senha incorretos.')
  })

  test('validação do formulário foca o primeiro campo inválido', async ({ page }) => {
    await gotoStable(page, '/?auth=criar-conta')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByLabel('Nome de usuário')).toBeFocused()
    await expect(dialog.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.getByText('O nome de usuário precisa ter ao menos 3 caracteres.')).toBeVisible()
  })

  test('cadastro cria a conta e já entra', async ({ page }) => {
    await gotoStable(page, '/?auth=criar-conta')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome de usuário').fill('novacolecionadora')
    await dialog.getByLabel('E-mail').fill('nova@kurio.dev')
    await dialog.getByLabel('Senha', { exact: true }).fill('senha12345')
    await dialog.getByLabel('Confirmar senha').fill('senha12345')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Olá, novacolecionadora!')).toBeVisible()
  })

  test('Esc fecha o modal e devolve o foco a quem abriu', async ({ page }) => {
    test.skip(isMobile(page), 'O botão Entrar fica no Header, que é só desktop')
    await gotoStable(page, '/')
    const trigger = page.locator('header').getByRole('link', { name: 'Entrar' })
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).not.toHaveURL(/auth=/)
    await expect(trigger).toBeFocused()
  })

  test('/cadastro abre o formulário de cadastro', async ({ page }) => {
    await page.goto('/cadastro?scenario=stable')
    // Desktop shows tabs; the mobile frame shows a full-screen form with its own title
    await expect(page.getByRole('dialog').getByLabel('Confirmar senha')).toBeVisible()
  })

  test('páginas da conta pedem login e "Sair" encerra a sessão', async ({ page }) => {
    for (const path of ['/pagamento', '/perfil', '/carteiras', '/favoritos']) {
      await gotoStable(page, path)
      await expect(page.getByRole('heading', { name: 'Entre na sua conta' }), path).toBeVisible()
    }

    await gotoStable(page, '/pagamento')
    await signIn(page)
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/pagamento')
    await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible()
  })

  test('sessão expirada pede login novamente', async ({ page }) => {
    await gotoStable(page, '/pagamento')
    await signIn(page)
    await gotoStable(page, '/pagamento', 'session-expired')
    // The API answers 401: the app warns and opens the sign-in dialog on the same page
    await expect(page.getByText(/Sua sessão expirou/)).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento/)
  })
})
