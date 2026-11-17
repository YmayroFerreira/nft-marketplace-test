import { expect, test } from '@playwright/test'
import { gotoStable, isMobile, signIn } from './support/helpers.ts'

test.describe('Favoritos', () => {
  test('favoritar aparece na lista de interesse', async ({ page }) => {
    await gotoStable(page, '/nft/golden-beat-207')
    await signIn(page)
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/favoritos')
    await expect(page.getByRole('article').filter({ hasText: 'Golden Beat #207' })).toBeVisible()
  })

  test('falha ao favoritar desfaz a atualização otimista', async ({ page }) => {
    await gotoStable(page, '/', 'favorites-fail')
    await signIn(page)
    const card = page.locator('#catalogo article', { hasText: 'Emerald Ape #042' })
    if (!isMobile(page)) await card.hover()
    await card.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).click()

    // Optimistic: the heart turns on before the API answers...
    await expect(card.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' })).toBeVisible()
    // ...and is rolled back when the request fails
    await expect(page.getByText(/A alteração foi desfeita/)).toBeVisible()
    await expect(card.getByRole('button', { name: 'Favoritar Emerald Ape #042' })).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('Perfil e carteiras', () => {
  test('editar o perfil atualiza o nome exibido', async ({ page }) => {
    await gotoStable(page, '/perfil')
    await signIn(page)
    await page.getByLabel(/Nome de exibição/).fill('Nova Sato')
    await page.getByRole('button', { name: 'Salvar' }).first().click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel(/Nome de exibição/)).toHaveValue('Nova Sato')
  })

  test('trocar senha valida a senha atual', async ({ page }) => {
    await gotoStable(page, '/perfil')
    await signIn(page)
    await page.getByLabel('Senha atual').fill('errada123')
    await page.getByLabel('Nova senha', { exact: true }).fill('nova12345')
    await page.getByLabel('Confirmar nova senha').fill('nova12345')
    await page.getByRole('button', { name: 'Salvar' }).last().click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()
  })

  test('adicionar carteira valida o endereço e salva', async ({ page }) => {
    await gotoStable(page, '/carteiras')
    await signIn(page)
    await page.getByRole('button', { name: 'Adicionar' }).click()
    await page.getByLabel(/Apelido da carteira/).fill('Cofre')
    await page.getByLabel(/Rede/).selectOption('solana')
    await page.getByLabel(/Endereço da carteira/).fill('0x123')
    await page.getByLabel(/Tipo de carteira/).selectOption('walletconnect')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Informe um endereço 0x válido (40 caracteres hexadecimais).')).toBeVisible()
    await expect(page.getByLabel(/Endereço da carteira/)).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel(/Endereço da carteira/).fill('0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByRole('region', { name: 'Carteira secundária' }).getByText('Cofre')).toBeVisible()
  })

  test('tornar uma carteira principal', async ({ page }) => {
    await gotoStable(page, '/carteiras')
    await signIn(page)
    await page.getByRole('button', { name: 'Tornar principal' }).click()
    await expect(page.getByRole('region', { name: 'Carteira principal' }).getByText('Reserva')).toBeVisible()
  })
})
