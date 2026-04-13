# Flowti Frontend Design

**Datum:** 2026-04-13
**Status:** Genehmigt

## Überblick

Flowti ist ein React-TypeScript-Frontend für das `exp-server` Backend — ein Enterprise-Prüfungsverwaltungssystem (Spring Boot). Das Frontend deckt den vollständigen Prüfungsdurchführungs-Workflow ab: von der Portfolio-Verwaltung über die Zuweisung von Prüflingen, die Generierung und den Upload von Antwortbögen bis hin zum Rohdaten-Export.

## Technologie-Stack

- **Framework:** React 19 + TypeScript (Vite)
- **UI-Bibliothek:** Ant Design
- **State Management:** Zustand
- **Routing:** React Router v6
- **HTTP:** nativer `fetch` mit zentralem Wrapper

## Backend

- **URL:** konfigurierbar (wird im Login gesetzt)
- **Authentifizierung:** OAuth2 (Platzhalter-Login jetzt, echtes OAuth2 später)
- **Endpunkte:** ~250 REST-Endpunkte in `exp-app` (Spring Boot)
- **Hauptcontroller:** Portfolio, Exam, Examinee, Examiner, Actor, User, Client, Scan, Rawdata, RawdataPaperbased, Folder, Settings, Session, Localization, LogEntry, ReviewTemplate, Software, ExamineeExamAssociation, ExaminerExamAssociation

## Navigationsstruktur

```
App
├── /login                   → Login-Seite (Platzhalter, Server-URL + Credentials)
└── / (geschützt, AuthGuard)
    ├── Layout (Ant Design Sider + Header)
    └── Routen
        ├── /portfolios      → Portfolio-Liste & Detail-Workflow
        ├── /exams           → Examen verwalten
        ├── /examinees       → Prüflinge & Zuweisungen
        ├── /scans           → Antwortbögen hochladen & verwalten
        ├── /rawdata         → Rohdaten & Export
        └── /settings        → Nutzer, Clients, Konfiguration, Lokalisierung
```

## Prüfungsdurchführungs-Workflow

Der Kern-Workflow läuft innerhalb der Portfolio-Detailansicht:

1. **Portfolio auswählen** — Liste aller Portfolios, Filterung nach Status
2. **Examen anzeigen** — Examen im Portfolio mit Metadaten
3. **Prüflinge zuweisen** — Examinee anlegen, Exam-Zuweisungen verwalten
4. **Antwortbogen generieren** — ZIP-Download via `GET /{clientId}/portfolio/{portfolioId}/exam/{examId}`
5. **Scan hochladen** — Ausgefüllte Bögen via ScanController hochladen
6. **Auswertung** — Rawdata & RawdataPaperbased Endpunkte
7. **Export** — CSV/ZIP-Download der Rohdaten

## Projektstruktur

```
app/src/
├── api/                        # HTTP-Clients pro Controller
│   ├── client.ts               # fetch-Wrapper mit Auth-Header
│   ├── portfolioApi.ts
│   ├── examApi.ts
│   ├── examineeApi.ts
│   ├── examinerApi.ts
│   ├── actorApi.ts
│   ├── userApi.ts
│   ├── clientApi.ts
│   ├── scanApi.ts
│   ├── rawdataApi.ts
│   ├── rawdataPaperbasedApi.ts
│   ├── folderApi.ts
│   ├── settingsApi.ts
│   ├── sessionApi.ts
│   ├── localizationApi.ts
│   ├── logEntryApi.ts
│   ├── reviewTemplateApi.ts
│   ├── softwareApi.ts
│   └── associationApi.ts
├── stores/
│   ├── authStore.ts            # Token, Login-Status, Server-URL
│   └── configStore.ts          # App-Konfiguration
├── pages/
│   ├── LoginPage.tsx           # Platzhalter-Login (Server-URL, User, Passwort)
│   ├── PortfoliosPage.tsx      # Portfolio-Liste + Detail-Workflow
│   ├── ExamsPage.tsx           # Examen verwalten
│   ├── ExamineesPage.tsx       # Prüflinge & Zuweisungen
│   ├── ScansPage.tsx           # Upload & Verwaltung von Scans
│   ├── RawdataPage.tsx         # Rohdaten & Export
│   └── SettingsPage.tsx        # Nutzer, Clients, Konfiguration
├── components/
│   ├── Layout.tsx              # Ant Design Sider + Header + Content
│   ├── AuthGuard.tsx           # Redirect zu /login wenn nicht authentifiziert
│   └── shared/
│       ├── PageHeader.tsx      # Wiederverwendbarer Seitentitel
│       └── ErrorAlert.tsx      # Einheitliche Fehleranzeige
└── types/
    ├── portfolio.ts            # TypeScript-Typen aus Backend-DTOs
    ├── exam.ts
    ├── examinee.ts
    ├── scan.ts
    ├── rawdata.ts
    └── common.ts               # PageDTO, ErrorDTO, etc.
```

## State Management

### `authStore`
```ts
{
  token: string | null
  serverUrl: string
  isAuthenticated: boolean
  login(serverUrl, token): void
  logout(): void
}
```

### `configStore`
```ts
{
  sidebarCollapsed: boolean
  toggleSidebar(): void
}
```

## HTTP-Client

Zentraler `fetch`-Wrapper in `api/client.ts`:
- Fügt `Authorization: Bearer {token}` Header hinzu
- Liest `serverUrl` aus `authStore`
- Gibt typisierte Responses zurück
- Einheitliche Fehlerbehandlung (wirft `ApiError` mit Code + Message)

## Login-Seite (Platzhalter)

Einfaches Formular mit:
- Server-URL (Textfeld)
- Benutzername (Textfeld)
- Passwort (Passwortfeld)
- Login-Button

Speichert Token (Dummy) in `authStore`, leitet zu `/portfolios` weiter. Echte OAuth2-Integration wird später ergänzt.

## Fehlerbehandlung

- HTTP-Fehler werden als Ant Design `notification` angezeigt
- 401 leitet automatisch zur Login-Seite weiter
- Ladezustände mit Ant Design `Spin`/`Skeleton`

## Nicht im Scope (initiale Version)

- Echte OAuth2-Authentifizierung (wird später ergänzt)
- Offline-Fähigkeit
- Rollenbasierte Zugriffskontrolle im Frontend
- Erweiterte Filterfunktionen
- Dark Mode
