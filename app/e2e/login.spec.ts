import { test, expect } from '@playwright/test'

test.describe('Login-Seite', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage BEVOR Seite und Scripts laden leeren
    // → Zustand-Store startet ohne persistierten Auth-State
    await page.addInitScript(() => localStorage.clear())
  })

  test('zeigt Login-Formular mit allen Feldern', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('flow')).toBeVisible()
    await expect(page.getByLabel('Benutzername')).toBeVisible()
    await expect(page.getByLabel('Passwort')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
  })

  test('zeigt Validierungsfehler bei leerem Formular', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: 'Anmelden' }).click()

    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 3000 })
  })

  test('leitet nicht-eingeloggte Nutzer von / zu /login weiter', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('leitet nicht-eingeloggte Nutzer von /portfolios zu /login weiter', async ({ page }) => {
    await page.goto('/portfolios')
    await expect(page).toHaveURL(/\/login/)
  })
})
