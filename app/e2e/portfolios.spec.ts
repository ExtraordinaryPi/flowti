import { test, expect } from '@playwright/test'

// Auth-State in localStorage setzen BEVOR die Seite und Zustand-Store laden
async function setAuthenticated(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('flow-auth', JSON.stringify({
      state: { token: '', serverUrl: '', isAuthenticated: true },
      version: 0,
    }))
  })
}

test.describe('Portfolios-Seite', () => {
  test('zeigt Portfolios-Seite nach Auth-State-Injection', async ({ page }) => {
    await setAuthenticated(page)
    await page.goto('/portfolios')

    // Seite sollte NICHT zu /login weiterleiten
    await expect(page).not.toHaveURL(/\/login/)

    // Überschrift als Heading prüfen (eindeutig)
    await expect(page.getByRole('heading', { name: 'Alle Portfolios' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Neu' })).toBeVisible()
  })

  test('zeigt Ordner-Panel', async ({ page }) => {
    await setAuthenticated(page)
    await page.goto('/portfolios')

    // "Ordner" als <strong> im Panel-Header (eindeutig)
    await expect(page.locator('strong').filter({ hasText: 'Ordner' })).toBeVisible({ timeout: 5000 })
  })

  test('Neu-Button öffnet Portfolio-Dialog', async ({ page }) => {
    await setAuthenticated(page)
    await page.goto('/portfolios')

    // Erst warten bis Seite vollständig geladen (Heading sichtbar)
    await expect(page.getByRole('heading', { name: 'Alle Portfolios' })).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Neu' }).click()

    // Ant Design Modal sollte erscheinen (role=dialog ist semantisch stabiler als CSS-Klassen)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('dialog').getByText('Portfolio hinzufügen')).toBeVisible()
  })
})
