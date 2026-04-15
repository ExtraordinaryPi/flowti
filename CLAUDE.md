# Flow – Projektdokumentation

Flow ist eine React-Webanwendung für die Verwaltung von Prüfungsportfolios: Scan-Upload, Scan-Validierung, Antwortbogen-Generierung und Prüfling-Management.

## Tech-Stack

| Schicht | Technologie |
|---|---|
| UI-Framework | **Ant Design 6** (German Locale `de_DE`) |
| React | React 19, TypeScript 5.9 (strict) |
| Build | Vite 8 |
| Routing | React Router 7 |
| State | Zustand 5 (mit `persist`) |
| HTTP | Eigener Fetch-Client (`src/api/client.ts`) |

## Entwicklung

```bash
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Produktions-Build (Output: dist/)
npm run lint       # ESLint prüfen
npm run lint:fix   # ESLint automatisch korrigieren
npx tsc --noEmit   # TypeScript prüfen ohne Build
```

Der Dev-Server proxiert folgende Pfade zum Backend (Standard `http://localhost:8080`, konfigurierbar via `VITE_API_TARGET`):

```
/rest, /oauth2, /xexam, /perform_login, /logout
```

## Projektstruktur

```
src/
  api/          # API-Wrapper (je ein Objekt pro Ressource)
  components/   # Wiederverwendbare UI-Komponenten
  pages/        # Route-Komponenten (eine Datei pro Route)
  stores/       # Zustand Stores (authStore, configStore)
  types/        # TypeScript Interfaces
  utils/        # Hilfsfunktionen (canvasUtils, pageUtils)
```

## UI-Regeln

- **Ant Design hat immer Vorrang** – Native HTML-Elemente nur wenn Ant Design keine Entsprechung bietet.
- Icons ausschließlich aus `@ant-design/icons`.
- Dialoge/Bestätigungen immer mit `App.useApp()` (`modal`, `notification`) – nicht `Modal.confirm()` direkt.
- Theme-Token (`token.colorBorderSecondary` etc.) statt Hardcoded-Farben im Layout.

## Authentifizierung

**Login:** POST zu `/perform_login` mit `URLSearchParams` (Form-Login, kein JSON).

Der API-Client in `client.ts` macht automatisch:
- `credentials: 'include'` → Session-Cookie wird immer mitgeschickt.
- `Authorization: Bearer <token>` → nur wenn `authStore.token` gesetzt ist.
- Bei `401` → automatisches Logout + Redirect zu `/login`.

Persistierung in localStorage:
- `flow-auth` → `authStore` (token, serverUrl, isAuthenticated)
- `flow-config` → `configStore` (isDarkMode)

## API-Layer

Jede Ressource hat eine eigene Datei in `src/api/`:

| Datei | Ressource | Base-Pfad |
|---|---|---|
| `portfolioApi.ts` | Portfolios, Scans, Checks | `/rest/app/portfolio` |
| `rawdataPaperbasedApi.ts` | Scan-Bilder, Entry-Values | `/rest/app/rawdataPaperbased` |
| `examApi.ts` | Prüfungen | `/rest/app/exam` |
| `examineeApi.ts` | Prüflinge | `/rest/app/examinee` |
| `examinerApi.ts` | Prüfer | `/rest/app/examiner` |
| `folderApi.ts` | Ordner | `/rest/app/folder` |
| `clientApi.ts` | Clients | `/rest/app/client` |
| `settingsApi.ts` | Benutzer, Konfiguration | `/rest/app/session`, `/rest/app/config` |
| `actorApi.ts` | Akteure | `/rest/app/actor` |
| `scanApi.ts` | Scans (allgemein) | `/rest/app/scan` |
| `rawdataApi.ts` | Rohdaten | `/rest/app/rawdata` |
| `associationApi.ts` | Examinee/Examiner-Examen-Zuordnungen | `/rest/app/...ExamAssociation` |

### Wichtige Backend-Eigenheiten

**Paginierung:** Das Backend verwendet Ext.js-Pagination-Konvention:
- `page` ist **1-basiert** (nie `page=0` senden – 400er Fehler).
- Parametername ist `limit`, nicht `size`.
- `start = (page - 1) * limit` muss zusätzlich mitgesendet werden.

**Filter-Format:** Ext.js JSON-Array als Query-String:
```
filter=[{"property":"value","value":"UNCHECKED"}]
```

**PUT-Requests:** Alle PUT-Bodies müssen das `id`-Feld enthalten, das der Pfad-Variable entspricht (`ReferenceDto`-Muster). Fehlt `id`, wirft das Backend `MISMATCH_ID_SAVE_OBJECT`.
```typescript
// Korrekt:
put(`/portfolio/${id}/checked/${entryId}`, { id: entryId, ...data })
// Falsch – führt zu 500:
put(`/portfolio/${id}/checked/${entryId}`, data)
```

**Array vs. Page:** Manche Endpunkte liefern je nach Parametern entweder `T[]` oder `Page<T>`. Den `toArray`-Helper aus `src/utils/pageUtils.ts` verwenden:
```typescript
import { toArray } from '../utils/pageUtils';
const items = toArray<MyType>(apiResult);
```

## Canvas und Koordinatensystem

Das Backend liefert normalisierte Koordinaten im **mathematischen Koordinatensystem** (y=0 unten, y=1 oben). HTML-Canvas hat y=0 oben.

Immer die Hilfsfunktionen aus `src/utils/canvasUtils.ts` verwenden:
```typescript
import { apiYToCanvas, apiRectYToCanvas, mouseYToApiY } from '../utils/canvasUtils';

// Punkt zeichnen:
const cy = apiYToCanvas(entry.y, canvasH);
// Rechteck zeichnen:
const rectTop = apiRectYToCanvas(entry.y, entry.height, canvasH);
// Klick-Koordinate zurückrechnen:
const apiY = mouseYToApiY(e.clientY, rect.top, rect.height);
```

## Scan-Viewer-Strategie

`ScanValidationViewer` (Antwort-Boxen, klickbar) verwendet einen anderen Ansatz als `ScanImageViewer` (Marker-Overlay):

- **ScanValidationViewer:** Canvas in **nativer Bildauflösung** (`canvas.width = img.naturalWidth`), CSS `width: 100%` skaliert herunter. Kein Layout-Timing-Problem.
- **ScanImageViewer:** `<img>` + darübergelegtes `<canvas>` (position: absolute). `ResizeObserver` zeichnet neu wenn sich das `<img>` ändert.

## Routing und Navigation

```
/login               → LoginPage (ungeschützt)
/portfolios          → PortfoliosPage (Default nach Login)
/settings            → SettingsPage
```

`/exams`, `/examinees`, `/scans`, `/rawdata` existieren als Routen, sind aber nicht in der Hauptnavigation verlinkt.

`AuthGuard` (`src/components/AuthGuard.tsx`) schützt alle Routen unterhalb von `/` und leitet bei fehlendem `isAuthenticated` zu `/login` weiter.

## State Management

Nur zwei Stores – beide mit Zustand `persist`:

**`authStore`** – Authentifizierungszustand:
```typescript
{ token, serverUrl, isAuthenticated, login(), logout() }
```

**`configStore`** – UI-Präferenzen:
```typescript
{ isDarkMode, toggleDarkMode() }  // Default: isDarkMode = true
```

Für komplexen Komponenten-State (Formulare, Listen, Loading) lokale `useState`/`useCallback`/`useEffect`-Hooks verwenden – kein globaler Store.

## TypeScript-Konfiguration

Strict-Mode ist aktiv: `noUnusedLocals`, `noUnusedParameters`, `strict`. Vor dem Commit prüfen:
```bash
npx tsc --noEmit
```

Pre-existierende Fehler (betreffen `PageParams`-Typen in API-Dateien) ignorieren – sie waren vor diesem Projekt vorhanden.

## Tests

```bash
npm run test        # Vitest im Watch-Mode
npm run test:run    # Vitest einmalig (CI)
npm run test:coverage  # mit Coverage-Report (HTML in coverage/)
npm run test:e2e    # Playwright E2E (startet Vite-Dev-Server automatisch)
```

### Unit- und Integrationstests (Vitest + RTL + MSW)

```
src/
  test/
    setup.ts           # MSW-Server-Lifecycle (beforeAll/afterEach/afterAll)
    mocks/
      server.ts        # setupServer() für Node
      handlers.ts      # HTTP-Handler-Definitionen (http.get, http.post, …)
  utils/__tests__/     # Pure-Function-Tests (canvasUtils, pageUtils)
  stores/__tests__/    # Store-Tests ohne React (useStore.getState())
  components/__tests__ # Integrationstests mit render() + MemoryRouter
```

**Wichtig:** Zustand-Stores vor jedem Test zurücksetzen:
```typescript
beforeEach(() => {
  useAuthStore.setState({ token: null, serverUrl: '', isAuthenticated: false })
})
```

MSW-Handler für neue Endpunkte in `src/test/mocks/handlers.ts` ergänzen.

### E2E-Tests (Playwright)

Konfiguration: `app/playwright.config.ts`  
Tests: `app/e2e/*.spec.ts`  
Browser: Chromium unter `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`

**Auth-State in E2E-Tests ohne echten Login:**
```typescript
// Vor page.goto() aufrufen – setzt localStorage BEVOR Zustand-Store initialisiert
await page.addInitScript(() => {
  localStorage.setItem('flow-auth', JSON.stringify({
    state: { token: '', serverUrl: '', isAuthenticated: true },
    version: 0,
  }))
})
```

**Selektoren:** Semantische Locators bevorzugen (`getByRole`, `getByLabel`) statt CSS-Klassen (`ant-modal-content`), da Ant Design CSS-Klassen versioniert.

## Fehlerbehandlung

Der API-Client wirft `ApiError` (aus `src/api/client.ts`) mit `code`, `title`, `status`. In Komponenten:
```typescript
try {
  await someApi.call();
} catch (e: unknown) {
  notification.error({ message: e instanceof Error ? e.message : 'Fehler' });
}
```
