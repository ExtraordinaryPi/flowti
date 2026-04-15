import { test, expect, type Page } from '@playwright/test'

// ── Konstanten ─────────────────────────────────────────────────────────────────
const PORTFOLIO_ID = 42
const FOLDER_ID = 10
const EXAM_ID = 1
const SCAN_ID = 100

// ── Mock-Daten ─────────────────────────────────────────────────────────────────
const mockFolder = { id: FOLDER_ID, name: 'Testordner', parentId: -1 }

const mockPortfolio = {
  id: PORTFOLIO_ID,
  name: 'Mathematik WS 2024',
  state: 'ACTIVE',
  config: [],
  portfolioConfig: {
    language: 'de',
    columnCount: 2,
    coverPage: false,
    withQuestionSheets: true,
    sortingPrimary: 'IDENTIFIER',
    grouping: 'NONE',
    scale: 1,
  },
  totalQuestionSheets: 1,
  rawdataCount: 1,
  folder: { id: FOLDER_ID, name: 'Testordner' },
}

const mockExam = {
  id: EXAM_ID,
  name: 'Klausur Mathematik',
  title: 'Klausur Mathematik',
  state: 'ACTIVE',
  totalQuestions: 10,
  totalPoints: 20,
  variants: 1,
  exported: false,
}

const mockExaminee = {
  id: 1,
  firstName: 'Max',
  lastName: 'Mustermann',
  examVariants: { [String(EXAM_ID)]: 1 },
}

const mockScan = {
  id: SCAN_ID,
  scanState: 'VALID',
  scanReviewState: 'NEEDS_REVIEW',
  name: 'scan_001',
  page: 1,
  examId: EXAM_ID,
  problemCount: 0,
  variant: 1,
}

// 1×1 transparentes PNG als Buffer – für gemockte Scan-Bilder
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

function makePage<T>(content: T[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 200,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  }
}

// ── API-Mocks via page.route() ─────────────────────────────────────────────────
// Playwright nutzt LIFO-Reihenfolge: zuletzt registrierte Route wird zuerst geprüft.
// Deshalb: Catch-all-Routen ZUERST, spezifische Routen DANACH registrieren.

async function setupApiMocks(page: Page) {
  // Zustandsvariablen – werden durch POST-Aktionen aktualisiert
  let folders: object[] = []
  let portfolios: object[] = []

  // ── Catch-alls zuerst (niedrigste Priorität in LIFO) ─────────────────────────

  // Portfolio catch-all (zuerst = niedrigste Priorität)
  await page.route('**/rest/app/portfolio**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: makePage(portfolios) })
    } else {
      await route.continue()
    }
  })

  // Scan-Vollbild-Basis (zuerst, damit Sub-Pfade höhere Priorität haben)
  await page.route(`**/rest/app/rawdataPaperbased/${SCAN_ID}`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ body: TRANSPARENT_PNG, headers: { 'content-type': 'image/png' } })
    } else {
      await route.continue()
    }
  })

  // ── Ordner ──────────────────────────────────────────────────────────────────
  await page.route('**/rest/app/folder', async route => {
    if (route.request().method() === 'POST') {
      folders = [mockFolder]
      await route.fulfill({ json: mockFolder })
    } else {
      await route.fulfill({ json: folders })
    }
  })

  await page.route('**/rest/app/folder/*/portfolios**', async route => {
    await route.fulfill({ json: makePage(portfolios) })
  })

  // ── Portfolio: spezifische Routen (später = höhere Priorität in LIFO) ─────────

  await page.route('**/rest/app/portfolio/state**', async route => {
    await route.fulfill({ json: makePage([{ id: 1, name: 'ACTIVE', state: 'ACTIVE' }]) })
  })

  await page.route('**/rest/app/portfolio/ims', async route => {
    portfolios = [mockPortfolio]
    await route.fulfill({ json: mockPortfolio })
  })

  await page.route('**/rest/app/portfolio/qti', async route => {
    portfolios = [mockPortfolio]
    await route.fulfill({ json: mockPortfolio })
  })

  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}/exams`, async route => {
    await route.fulfill({ json: [mockExam] })
  })

  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}/examinees**`, async route => {
    await route.fulfill({ json: makePage([mockExaminee]) })
  })

  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}/scansInvalidPaged**`, async route => {
    await route.fulfill({ json: makePage([]) })
  })

  // validRawdataPaperbased (exakt, ohne Query-Params)
  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}/validRawdataPaperbased`, async route => {
    await route.fulfill({ json: [mockScan] })
  })

  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}/rawdataPaperbased**`, async route => {
    await route.fulfill({ json: makePage([mockScan]) })
  })

  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}/checked**`, async route => {
    await route.fulfill({ json: makePage([]) })
  })

  // Portfolio-Detail (ID-spezifisch)
  await page.route(`**/rest/app/portfolio/${PORTFOLIO_ID}`, async route => {
    await route.fulfill({ json: mockPortfolio })
  })

  // ── Examen-Scans ─────────────────────────────────────────────────────────────
  await page.route(`**/rest/app/exam/${EXAM_ID}/rawdataPaperbasedPaged**`, async route => {
    await route.fulfill({ json: makePage([mockScan]) })
  })

  // ── Scan-Sub-Routen (zuletzt = höchste Priorität, überschreiben Scan-Basis) ──
  await page.route(`**/rest/app/rawdataPaperbased/${SCAN_ID}/thumbnail`, async route => {
    await route.fulfill({ body: TRANSPARENT_PNG, headers: { 'content-type': 'image/png' } })
  })

  await page.route(`**/rest/app/rawdataPaperbased/${SCAN_ID}/markerBarcodeEntries`, async route => {
    await route.fulfill({ json: [] })
  })

  await page.route(`**/rest/app/rawdataPaperbased/${SCAN_ID}/boundElementsNoWarp`, async route => {
    await route.fulfill({ json: [] })
  })

  await page.route(`**/rest/app/rawdataPaperbased/${SCAN_ID}/entryValues**`, async route => {
    await route.fulfill({ json: [] })
  })
}

// ── Auth-State ─────────────────────────────────────────────────────────────────
async function setAuthenticated(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('flow-auth', JSON.stringify({
      state: { token: '', serverUrl: '', isAuthenticated: true },
      version: 0,
    }))
  })
}

// ── Haupttest ──────────────────────────────────────────────────────────────────

test('vollständiger Portfolio-Workflow: Ordner → Portfolio → alle Tabs → Rohdaten-Export', async ({ page }) => {
  await setAuthenticated(page)
  await setupApiMocks(page)
  await page.goto('/portfolios')

  // ── 1. Ordner erstellen ──────────────────────────────────────────────────────
  await test.step('Ordner erstellen', async () => {
    // "+" Button im Ordner-Panel
    await page.getByTitle('Neuer Ordner').click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('Ordnername').fill('Testordner')
    await page.getByRole('button', { name: 'Erstellen' }).click()

    // Ordner erscheint im Verzeichnisbaum
    await expect(page.locator('.ant-tree-title').filter({ hasText: 'Testordner' }))
      .toBeVisible({ timeout: 3000 })
  })

  // ── 2. Ordner auswählen ──────────────────────────────────────────────────────
  await test.step('Ordner auswählen', async () => {
    await page.locator('.ant-tree-title').filter({ hasText: 'Testordner' }).click()
    // Heading wechselt auf Ordnernamen
    await expect(page.getByRole('heading', { name: 'Testordner' })).toBeVisible({ timeout: 3000 })
  })

  // ── 3. Portfolio erstellen (via IMS QTI – nur Textfelder, kein File-Upload) ──
  await test.step('Portfolio erstellen via IMS QTI', async () => {
    await page.getByRole('button', { name: 'Neu' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Tab "IMS QTI" wählen (kein File-Upload nötig)
    await page.getByRole('dialog').getByText('IMS QTI').click()
    await page.getByPlaceholder('z. B. 101,102,103').fill('1')
    await page.getByPlaceholder('Neues Portfolio').fill('Mathematik WS 2024')
    await page.getByRole('button', { name: 'Importieren' }).click()

    // Portfolio erscheint in der Tabelle
    await expect(page.getByRole('cell', { name: 'Mathematik WS 2024' }))
      .toBeVisible({ timeout: 5000 })
  })

  // ── 4. Portfolio öffnen ──────────────────────────────────────────────────────
  await test.step('Portfolio öffnen', async () => {
    await page.getByRole('button', { name: 'Öffnen' }).first().click()
    await expect(page.getByRole('heading', { name: 'Mathematik WS 2024' }))
      .toBeVisible({ timeout: 5000 })
  })

  // ── 5. Tab: Examen ───────────────────────────────────────────────────────────
  await test.step('Tab Examen – Klausur sichtbar', async () => {
    // Examen ist der Default-Tab – Klausur-Name erscheint im Collapse
    await expect(page.getByText('Klausur Mathematik').first())
      .toBeVisible({ timeout: 3000 })
  })

  // ── 6. Tab: Prüflinge ────────────────────────────────────────────────────────
  await test.step('Tab Prüflinge – Max Mustermann sichtbar', async () => {
    await page.getByRole('tab', { name: /Prüflinge/ }).click()
    await expect(page.getByRole('cell', { name: 'Mustermann' })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('cell', { name: 'Max' })).toBeVisible()
  })

  // ── 7. Tab: Bögen ────────────────────────────────────────────────────────────
  await test.step('Tab Bögen – Einstellungen laden', async () => {
    await page.getByRole('tab', { name: 'Bögen' }).click()
    // SheetSettingsTab lädt portfolioConfig → zeigt u.a. "Sprache"-Feld
    await expect(page.getByText('Sprache').first()).toBeVisible({ timeout: 5000 })
  })

  // ── 8. Tab: Scan-Upload ──────────────────────────────────────────────────────
  await test.step('Tab Scan-Upload – Upload-Bereich sichtbar', async () => {
    await page.getByRole('tab', { name: 'Scan-Upload' }).click()
    // ScanUploadTab hat eine Card "Scans hochladen" – eindeutig für diesen Tab
    await expect(page.getByText('Scans hochladen').first()).toBeVisible({ timeout: 3000 })
  })

  // ── 9. Tab: Scan-Eckenerkennung ──────────────────────────────────────────────
  await test.step('Tab Scan-Eckenerkennung – Scan-Liste mit scan_001', async () => {
    await page.getByRole('tab', { name: 'Scan-Eckenerkennung' }).click()
    // PositionValidationPanel lädt validRawdataPaperbased → scan_001
    await expect(page.getByText('scan_001').first()).toBeVisible({ timeout: 5000 })
  })

  // ── 10. Tab: Scan-Prüfung ────────────────────────────────────────────────────
  await test.step('Tab Scan-Prüfung – Filter-Segmente sichtbar', async () => {
    await page.getByRole('tab', { name: 'Scan-Prüfung' }).click()
    // ScanChecksTab zeigt Segmented-Filter (Ungeprüft / Angekreuzt / Korrigiert / Alle)
    await expect(page.getByText('Ungeprüft').first()).toBeVisible({ timeout: 3000 })
  })

  // ── 11. Tab: Scan-Validierung ────────────────────────────────────────────────
  await test.step('Tab Scan-Validierung – Prüfbedarf-Counter sichtbar', async () => {
    await page.getByRole('tab', { name: 'Scan-Validierung' }).click()
    // ScanValidationTab zeigt immer einen "Prüfbedarf"-Badge (showZero) – eindeutig für diesen Tab
    await expect(page.getByText('Prüfbedarf').first()).toBeVisible({ timeout: 5000 })
  })

  // ── 12. Tab: Export → Rohdaten-Download ─────────────────────────────────────
  await test.step('Tab Export – Rohdaten-Export für Exam verfügbar', async () => {
    await page.getByRole('tab', { name: 'Export' }).click()

    // "Examen exportieren"-Karte sichtbar
    await expect(page.getByText('Examen exportieren').first()).toBeVisible({ timeout: 3000 })

    // Exam-Collapse aufklappen
    await page.getByText('Klausur Mathematik').last().click()

    // Export-Button mit Label "EX3 Export" sichtbar
    await expect(page.getByText('EX3 Export').first()).toBeVisible({ timeout: 3000 })
  })
})
