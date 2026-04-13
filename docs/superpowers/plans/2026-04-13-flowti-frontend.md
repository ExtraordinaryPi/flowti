# Flowti Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React+TypeScript+Ant Design Frontend für das exp-server Prüfungsverwaltungssystem mit vollständigem Workflow (Portfolios → Examen → Prüflinge → Scans → Export).

**Architecture:** Seitenleisten-Layout (Ant Design Sider) mit 6 Hauptseiten, je einer API-Datei pro Controller, Zustand-Stores für Auth und Config, nativer fetch als HTTP-Client.

**Tech Stack:** React 19, TypeScript, Ant Design 5, Zustand, React Router v6, Vite

---

## Dateistruktur

```
app/src/
├── api/
│   ├── client.ts                  # fetch-Wrapper mit Auth-Header
│   ├── portfolioApi.ts            # /rest/app/portfolio (71 Endpunkte)
│   ├── examApi.ts                 # /rest/app/exam (25 Endpunkte)
│   ├── examineeApi.ts             # /rest/app/examinee
│   ├── examinerApi.ts             # /rest/app/examiner
│   ├── actorApi.ts                # /rest/app/actor
│   ├── userApi.ts                 # /rest/app/user
│   ├── clientApi.ts               # /rest/app/client
│   ├── folderApi.ts               # /rest/app/folder
│   ├── scanApi.ts                 # /rest/app/scan
│   ├── rawdataApi.ts              # /rest/app/rawdata
│   ├── rawdataPaperbasedApi.ts    # /rest/app/rawdataPaperbased
│   ├── settingsApi.ts             # /rest/app/config + /rest/app/session
│   └── associationApi.ts          # examineeExamAssociation + examinerExamAssociation
├── stores/
│   ├── authStore.ts
│   └── configStore.ts
├── types/
│   ├── common.ts
│   ├── portfolio.ts
│   ├── exam.ts
│   ├── examinee.ts
│   ├── scan.ts
│   └── user.ts
├── components/
│   ├── AuthGuard.tsx
│   └── AppLayout.tsx
└── pages/
    ├── LoginPage.tsx
    ├── PortfoliosPage.tsx
    ├── ExamsPage.tsx
    ├── ExamineesPage.tsx
    ├── ScansPage.tsx
    ├── RawdataPage.tsx
    └── SettingsPage.tsx
```

---

## Task 1: Dependencies umrüsten

**Files:**
- Modify: `app/package.json`
- Modify: `app/src/main.tsx`
- Modify: `app/src/App.css`
- Delete: `app/src/App.css` Inhalt

- [ ] **Schritt 1: MUI deinstallieren, Ant Design + Router installieren**

```bash
cd /run/media/cmoses-work/347519ad-6e34-46bc-9fa5-c0f878afd7cc/external/Projects/flowti/app
npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install antd react-router-dom
npm install --save-dev @types/react-router-dom
```

Erwartete Ausgabe: `added X packages` ohne Fehler.

- [ ] **Schritt 2: main.tsx auf Ant Design umstellen**

Ersetze den Inhalt von `app/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Schritt 3: App.css leeren**

Ersetze `app/src/App.css` mit leerem Inhalt (Datei auf `/* global styles */` reduzieren).

- [ ] **Schritt 4: Build prüfen**

```bash
cd /run/media/cmoses-work/347519ad-6e34-46bc-9fa5-c0f878afd7cc/external/Projects/flowti/app
npm run build
```

Erwartete Ausgabe: Build erfolgreich ohne Fehler.

- [ ] **Schritt 5: Committen**

```bash
git add app/src/main.tsx app/src/App.css app/package.json app/package-lock.json
git commit -m "feat: replace MUI with Ant Design, add React Router"
```

---

## Task 2: TypeScript-Typen definieren

**Files:**
- Create: `app/src/types/common.ts`
- Create: `app/src/types/portfolio.ts`
- Create: `app/src/types/exam.ts`
- Create: `app/src/types/examinee.ts`
- Create: `app/src/types/scan.ts`
- Create: `app/src/types/user.ts`

- [ ] **Schritt 1: common.ts erstellen**

```typescript
// app/src/types/common.ts

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  empty: boolean;
}

export interface ApiError {
  code: string;
  title: string;
}

export interface EntityReduced {
  id: number;
  name: string;
}

export interface EntityShare {
  id: number;
  accessLevel: string;
  entity?: EntityReduced;
}

export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
}
```

- [ ] **Schritt 2: portfolio.ts erstellen**

```typescript
// app/src/types/portfolio.ts
import { EntityReduced } from './common';

export interface Portfolio {
  id: number;
  name: string;
  state: string;
  config: string[];
  folder?: EntityReduced;
  description?: string;
  lastUpdate?: string;
}

export interface PortfolioRequest {
  name: string;
  state?: string;
  config?: string[];
  folderId?: number;
  description?: string;
}

export interface PortfolioState {
  id: number;
  name: string;
  state: string;
}
```

- [ ] **Schritt 3: exam.ts erstellen**

```typescript
// app/src/types/exam.ts
import { EntityReduced } from './common';

export interface Exam {
  id: number;
  name: string;
  type: string;
  state: string;
  variants: number;
  portfolio?: EntityReduced;
  description?: string;
}

export interface ExamRequest {
  name: string;
  type?: string;
  state?: string;
  variants?: number;
  description?: string;
}

export interface ExamineeExamAssociation {
  id: number;
  examinee: EntityReduced;
  exam: EntityReduced;
  variant?: number;
}

export interface ExamineeExamAssociationRequest {
  examineeId: number;
  examId: number;
  variant?: number;
}

export interface ExaminerExamAssociation {
  id: number;
  examiner: EntityReduced;
  exam: EntityReduced;
}

export interface ExaminerExamAssociationRequest {
  examinerId: number;
  examId: number;
}
```

- [ ] **Schritt 4: examinee.ts erstellen**

```typescript
// app/src/types/examinee.ts

export interface Examinee {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  attributes?: Record<string, string>;
}

export interface ExamineeRequest {
  firstName: string;
  lastName: string;
  login?: string;
  attributes?: Record<string, string>;
}

export interface Examiner {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  attributes?: Record<string, string>;
}

export interface ExaminerRequest {
  firstName: string;
  lastName: string;
  login?: string;
}

export interface Actor {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
}

export interface ActorRequest {
  firstName: string;
  lastName: string;
  login?: string;
}
```

- [ ] **Schritt 5: scan.ts erstellen**

```typescript
// app/src/types/scan.ts
import { EntityReduced } from './common';

export interface Scan {
  id: number;
  state: string;
  reviewState: string;
  exam?: EntityReduced;
  examinee?: EntityReduced;
  variant?: number;
  pageCount?: number;
  created?: string;
}

export interface ScanRequest {
  state?: string;
  reviewState?: string;
  examineeId?: number;
  examId?: number;
  variant?: number;
}

export interface Rawdata {
  id: number;
  type: string;
  exam?: EntityReduced;
  examinee?: EntityReduced;
  created?: string;
}

export interface RawdataRequest {
  type?: string;
  examId?: number;
  examineeId?: number;
}
```

- [ ] **Schritt 6: user.ts erstellen**

```typescript
// app/src/types/user.ts

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  roles?: string[];
}

export interface UserRequest {
  username?: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Client {
  id: number;
  name: string;
  alias: string;
  state: string;
  lastLogin?: string;
}

export interface ClientRequest {
  name: string;
  alias?: string;
  password?: string;
}

export interface Folder {
  id: number;
  name: string;
  parent?: { id: number; name: string };
}

export interface FolderRequest {
  name: string;
  parentId?: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}
```

- [ ] **Schritt 7: Committen**

```bash
git add app/src/types/
git commit -m "feat: add TypeScript types for all backend DTOs"
```

---

## Task 3: Zustand-Stores

**Files:**
- Create: `app/src/stores/authStore.ts`
- Create: `app/src/stores/configStore.ts`

- [ ] **Schritt 1: authStore.ts erstellen**

```typescript
// app/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  serverUrl: string;
  isAuthenticated: boolean;
  login: (serverUrl: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      serverUrl: '',
      isAuthenticated: false,
      login: (serverUrl, token) =>
        set({ token, serverUrl, isAuthenticated: true }),
      logout: () =>
        set({ token: null, isAuthenticated: false }),
    }),
    { name: 'flowti-auth' }
  )
);
```

- [ ] **Schritt 2: configStore.ts erstellen**

```typescript
// app/src/stores/configStore.ts
import { create } from 'zustand';

interface ConfigState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
```

- [ ] **Schritt 3: Committen**

```bash
git add app/src/stores/
git commit -m "feat: add Zustand auth and config stores"
```

---

## Task 4: API-Client-Basis

**Files:**
- Create: `app/src/api/client.ts`

- [ ] **Schritt 1: client.ts erstellen**

```typescript
// app/src/api/client.ts
import { useAuthStore } from '../stores/authStore';

export class ApiError extends Error {
  constructor(public code: string, public title: string, public status: number) {
    super(title);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { token, serverUrl } = useAuthStore.getState();

  const url = `${serverUrl.replace(/\/$/, '')}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new ApiError('UNAUTHORIZED', 'Nicht autorisiert', 401);
  }

  if (!response.ok) {
    let errorBody: { code?: string; title?: string } = {};
    try {
      errorBody = await response.json();
    } catch {}
    throw new ApiError(
      errorBody.code ?? 'UNKNOWN',
      errorBody.title ?? `Fehler ${response.status}`,
      response.status
    );
  }

  // Für leere Responses (204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  // Binary/Blob responses
  return response.blob() as unknown as T;
}

export function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const query = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return request<T>(path + query);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function postForm<T>(path: string, formData: FormData): Promise<T> {
  const { token, serverUrl } = useAuthStore.getState();
  const url = `${serverUrl.replace(/\/$/, '')}${path}`;
  return fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(async (r) => {
    if (!r.ok) throw new ApiError('UPLOAD_ERROR', `Upload fehlgeschlagen`, r.status);
    if (r.status === 204) return undefined as T;
    return r.json();
  });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function downloadBlob(path: string): Promise<Blob> {
  return get<Blob>(path);
}
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/api/client.ts
git commit -m "feat: add typed fetch wrapper with auth and error handling"
```

---

## Task 5: Portfolio-API

**Files:**
- Create: `app/src/api/portfolioApi.ts`

- [ ] **Schritt 1: portfolioApi.ts erstellen**

```typescript
// app/src/api/portfolioApi.ts
import { get, post, postForm, put, del, downloadBlob } from './client';
import { Page, PageParams } from '../types/common';
import { Portfolio, PortfolioRequest, PortfolioState } from '../types/portfolio';
import { Exam } from '../types/exam';
import { Examinee, Examiner } from '../types/examinee';
import { Scan } from '../types/scan';

const BASE = '/rest/app/portfolio';

export const portfolioApi = {
  getAll: (params?: PageParams & { filter?: string }) =>
    get<Page<Portfolio>>(BASE, params),

  getById: (id: number) =>
    get<Portfolio>(`${BASE}/${id}`),

  getStates: (params?: PageParams) =>
    get<Page<PortfolioState>>(`${BASE}/state`, params),

  update: (id: number, data: PortfolioRequest) =>
    put<Portfolio>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  getExams: (id: number) =>
    get<Exam[]>(`${BASE}/${id}/exams`),

  getExaminees: (id: number, params?: PageParams) =>
    get<Page<Examinee>>(`${BASE}/${id}/examinees`, params),

  getExaminers: (id: number, params?: PageParams) =>
    get<Page<Examiner>>(`${BASE}/${id}/examiners`, params),

  getScansInvalid: (id: number, params?: PageParams) =>
    get<Page<Scan>>(`${BASE}/${id}/scansInvalidPaged`, params),

  getValidScans: (id: number) =>
    get<Scan[]>(`${BASE}/${id}/validRawdataPaperbased`),

  deleteScansInvalid: (id: number) =>
    del<void>(`${BASE}/${id}/scansInvalid`),

  deleteExaminees: (id: number, ids: number[]) =>
    del<void>(`${BASE}/${id}/examinees`, ids),

  deleteExaminers: (id: number, ids: number[]) =>
    del<void>(`${BASE}/${id}/examiners`, ids),

  uploadScans: (id: number, files: File[], fastPdf = false) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return postForm<unknown>(`${BASE}/${id}/scans/${fastPdf}`, form);
  },

  generateExaminees: (id: number, amount: number) =>
    post<void>(`${BASE}/${id}/examinees/generate/${amount}`),

  generateExaminers: (id: number, amount: number) =>
    post<Portfolio>(`${BASE}/${id}/examiners/generate/${amount}`),

  shuffle: (id: number) =>
    post<Portfolio>(`${BASE}/${id}/shuffle`),

  downloadAnswerSheets: (portfolioId: number) =>
    downloadBlob(`${BASE}/${portfolioId}/generatedAnswerSheets`),

  downloadAnswerSheetPreview: (portfolioId: number) =>
    downloadBlob(`${BASE}/${portfolioId}/answerSheetPreview`),

  downloadArchive: (id: number) =>
    downloadBlob(`${BASE}/${id}/archive`),

  downloadExamineesExcel: (id: number) =>
    downloadBlob(`${BASE}/${id}/examineesExcel`),

  downloadTrainingData: (id: number) =>
    downloadBlob(`${BASE}/${id}/trainingData`),

  importCsv: (portfolioId: number, data: unknown[]) =>
    post<void>(`${BASE}/importCsv/${portfolioId}`, data),
};
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/api/portfolioApi.ts
git commit -m "feat: add portfolio API module"
```

---

## Task 6: Exam-API

**Files:**
- Create: `app/src/api/examApi.ts`

- [ ] **Schritt 1: examApi.ts erstellen**

```typescript
// app/src/api/examApi.ts
import { get, post, postForm, put, del, downloadBlob } from './client';
import { Page, PageParams } from '../types/common';
import { Exam, ExamRequest } from '../types/exam';
import { Scan } from '../types/scan';

const BASE = '/rest/app/exam';

export const examApi = {
  getAll: (params?: PageParams) =>
    get<Page<Exam>>(BASE, params),

  getById: (id: number) =>
    get<Exam>(`${BASE}/${id}`),

  update: (id: number, data: ExamRequest) =>
    put<Exam>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  getScans: (id: number, params?: PageParams) =>
    get<Page<Scan>>(`${BASE}/${id}/rawdataPaperbasedPaged`, params),

  deleteAllScans: (id: number) =>
    del<void>(`${BASE}/${id}/rawdataPaperbased/all`),

  downloadQuestionSheet: (id: number, variant: number) =>
    downloadBlob(`${BASE}/${id}/questionSheet/${variant}`),

  downloadAllQuestionSheets: (id: number) =>
    downloadBlob(`${BASE}/${id}/questionSheets`),

  uploadQuestionSheet: (id: number, variant: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return postForm<unknown>(`${BASE}/${id}/questionSheet/${variant}`, form);
  },

  downloadRawData: (id: number, exportMode: string) =>
    downloadBlob(`${BASE}/${id}/generateRawData/${exportMode}`),

  getRawdataTable: (id: number, params?: PageParams) =>
    get<Page<Record<string, unknown>>>(`${BASE}/${id}/rawdataTable`, params),

  getDistributionData: (id: number, bucketSize: number, variant: number) =>
    get<Record<string, unknown>>(`${BASE}/${id}/distributionData/${bucketSize}/${variant}`),
};
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/api/examApi.ts
git commit -m "feat: add exam API module"
```

---

## Task 7: Personen-APIs (Examinee, Examiner, Actor, User)

**Files:**
- Create: `app/src/api/examineeApi.ts`
- Create: `app/src/api/examinerApi.ts`
- Create: `app/src/api/actorApi.ts`
- Create: `app/src/api/userApi.ts`
- Create: `app/src/api/associationApi.ts`

- [ ] **Schritt 1: examineeApi.ts erstellen**

```typescript
// app/src/api/examineeApi.ts
import { get, put, del } from './client';
import { Examinee, ExamineeRequest } from '../types/examinee';

const BASE = '/rest/app/examinee';

export const examineeApi = {
  getById: (id: number) =>
    get<Examinee>(`${BASE}/${id}`),

  update: (id: number, data: ExamineeRequest) =>
    put<Examinee>(`${BASE}/${id}`, data),

  updateMany: (data: ExamineeRequest[]) =>
    put<void>(BASE, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  deleteMany: (ids: number[]) =>
    del<void>(BASE, ids),
};
```

- [ ] **Schritt 2: examinerApi.ts erstellen**

```typescript
// app/src/api/examinerApi.ts
import { get, put, del } from './client';
import { Page, PageParams } from '../types/common';
import { Examiner, ExaminerRequest } from '../types/examinee';

const BASE = '/rest/app/examiner';

export const examinerApi = {
  getAll: (params?: PageParams) =>
    get<Page<Examiner>>(BASE, params),

  getById: (id: number) =>
    get<Examiner>(`${BASE}/${id}`),

  update: (id: number, data: ExaminerRequest) =>
    put<Examiner>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  deleteMany: (ids: number[]) =>
    del<void>(BASE, ids),
};
```

- [ ] **Schritt 3: actorApi.ts erstellen**

```typescript
// app/src/api/actorApi.ts
import { get, put, del } from './client';
import { Page, PageParams } from '../types/common';
import { Actor, ActorRequest } from '../types/examinee';

const BASE = '/rest/app/actor';

export const actorApi = {
  getAll: (params?: PageParams) =>
    get<Page<Actor>>(BASE, params),

  getById: (id: number) =>
    get<Actor>(`${BASE}/${id}`),

  update: (id: number, data: ActorRequest) =>
    put<Actor>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  deleteMany: (ids: number[]) =>
    del<void>(BASE, ids),
};
```

- [ ] **Schritt 4: userApi.ts erstellen**

```typescript
// app/src/api/userApi.ts
import { get, post, put, del } from './client';
import { Page, PageParams } from '../types/common';
import { User, UserRequest } from '../types/user';

const BASE = '/rest/app/user';

export const userApi = {
  getAll: (params?: PageParams) =>
    get<Page<User>>(BASE, params),

  getById: (id: number) =>
    get<User>(`${BASE}/${id}`),

  create: () =>
    post<User>(BASE),

  update: (id: number, data: UserRequest) =>
    put<User>(`${BASE}/${id}`, data),

  generatePasswords: (ids: number[]) =>
    put<void>(`${BASE}/generatePasswords`, ids),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  deleteMany: (ids: number[]) =>
    del<void>(BASE, ids),
};
```

- [ ] **Schritt 5: associationApi.ts erstellen**

```typescript
// app/src/api/associationApi.ts
import { put, del } from './client';
import {
  ExamineeExamAssociation,
  ExamineeExamAssociationRequest,
  ExaminerExamAssociation,
  ExaminerExamAssociationRequest,
} from '../types/exam';

export const examineeExamAssociationApi = {
  upsert: (data: ExamineeExamAssociationRequest) =>
    put<ExamineeExamAssociation>('/rest/app/examineeExamAssociation/', data),

  delete: (data: ExamineeExamAssociationRequest) =>
    del<void>('/rest/app/examineeExamAssociation/', data),
};

export const examinerExamAssociationApi = {
  upsert: (data: ExaminerExamAssociationRequest) =>
    put<ExaminerExamAssociation>('/rest/app/examinerExamAssociation/', data),

  delete: (data: ExaminerExamAssociationRequest) =>
    del<void>('/rest/app/examinerExamAssociation/', data),
};
```

- [ ] **Schritt 6: Committen**

```bash
git add app/src/api/examineeApi.ts app/src/api/examinerApi.ts app/src/api/actorApi.ts app/src/api/userApi.ts app/src/api/associationApi.ts
git commit -m "feat: add person and association API modules"
```

---

## Task 8: Scan- & Rawdata-APIs

**Files:**
- Create: `app/src/api/scanApi.ts`
- Create: `app/src/api/rawdataApi.ts`
- Create: `app/src/api/rawdataPaperbasedApi.ts`

- [ ] **Schritt 1: scanApi.ts erstellen**

```typescript
// app/src/api/scanApi.ts
import { put } from './client';
import { Scan, ScanRequest } from '../types/scan';

const BASE = '/rest/app/scan';

export const scanApi = {
  update: (id: number, data: ScanRequest) =>
    put<Scan>(`${BASE}/${id}`, data),
};
```

- [ ] **Schritt 2: rawdataApi.ts erstellen**

```typescript
// app/src/api/rawdataApi.ts
import { get, put, del } from './client';
import { Page, PageParams } from '../types/common';
import { Rawdata, RawdataRequest } from '../types/scan';

const BASE = '/rest/app/rawdata';

export const rawdataApi = {
  getAll: (params?: PageParams) =>
    get<Page<Rawdata>>(BASE, params),

  getById: (id: number) =>
    get<Rawdata>(`${BASE}/${id}`),

  update: (id: number, data: RawdataRequest) =>
    put<Rawdata>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),
};
```

- [ ] **Schritt 3: rawdataPaperbasedApi.ts erstellen**

```typescript
// app/src/api/rawdataPaperbasedApi.ts
import { get, post, postForm, put, del, downloadBlob } from './client';
import { Scan } from '../types/scan';

const BASE = '/rest/app/rawdataPaperbased';

export const rawdataPaperbasedApi = {
  getImage: (id: number) =>
    downloadBlob(`${BASE}/${id}`),

  getThumbnail: (id: number) =>
    downloadBlob(`${BASE}/${id}/thumbnail`),

  reprocess: (id: number, mode: string) =>
    post<Scan>(`${BASE}/${id}/${mode}`),

  reupload: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('filename', file.name);
    return postForm<Scan>(`${BASE}/reupload/${id}`, form);
  },

  flip: (id: number) =>
    put<void>(`${BASE}/${id}/flip`),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),
};
```

- [ ] **Schritt 4: Committen**

```bash
git add app/src/api/scanApi.ts app/src/api/rawdataApi.ts app/src/api/rawdataPaperbasedApi.ts
git commit -m "feat: add scan and rawdata API modules"
```

---

## Task 9: Admin-APIs (Client, Folder, Settings, Session)

**Files:**
- Create: `app/src/api/clientApi.ts`
- Create: `app/src/api/folderApi.ts`
- Create: `app/src/api/settingsApi.ts`

- [ ] **Schritt 1: clientApi.ts erstellen**

```typescript
// app/src/api/clientApi.ts
import { get, post, put, del, downloadBlob } from './client';
import { Page, PageParams } from '../types/common';
import { Client, ClientRequest } from '../types/user';

const BASE = '/rest/app/client';

export const clientApi = {
  getAll: (params?: PageParams) =>
    get<Page<Client>>(BASE, params),

  getById: (id: number) =>
    get<Client>(`${BASE}/${id}`),

  create: (data: ClientRequest) =>
    post<Client>(BASE, data),

  generate: (amount: number) =>
    post<Client[]>(`${BASE}/generate/${amount}`),

  update: (id: number, data: ClientRequest) =>
    put<Client>(`${BASE}/${id}`, data),

  addToPortfolio: (portfolioId: number, ids: number[]) =>
    put<void>(`${BASE}/portfolio/${portfolioId}/add`, ids),

  removeFromPortfolio: (portfolioId: number, ids: number[]) =>
    put<void>(`${BASE}/portfolio/${portfolioId}/remove`, ids),

  authorize: (ids: number[]) =>
    put<void>(`${BASE}/authorize`, ids),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  exportCsv: () =>
    downloadBlob(`${BASE}/export/csv`),
};
```

- [ ] **Schritt 2: folderApi.ts erstellen**

```typescript
// app/src/api/folderApi.ts
import { get, post, put, del } from './client';
import { Page, PageParams } from '../types/common';
import { Folder, FolderRequest } from '../types/user';
import { Portfolio } from '../types/portfolio';

const BASE = '/rest/app/folder';

export const folderApi = {
  getAll: () =>
    get<Folder[]>(BASE),

  getById: (id: number) =>
    get<Folder>(`${BASE}/${id}`),

  getPortfolios: (id: number, params?: PageParams) =>
    get<Page<Portfolio>>(`${BASE}/${id}/portfolios`, params),

  create: (data: FolderRequest) =>
    post<Folder>(BASE, data),

  update: (id: number, data: FolderRequest) =>
    put<Folder>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),
};
```

- [ ] **Schritt 3: settingsApi.ts erstellen**

```typescript
// app/src/api/settingsApi.ts
import { get, put } from './client';
import { CurrentUser } from '../types/user';

export const settingsApi = {
  getCurrentUser: () =>
    get<CurrentUser>('/rest/app/session/currentUser'),

  getConfig: () =>
    get<Record<string, string>>('/rest/app/session/config'),

  getAbout: () =>
    get<Record<string, string>>('/rest/app/config/about'),

  reindex: () =>
    put<void>('/rest/app/config/reindex'),

  downloadLogs: () =>
    get<unknown>('/rest/app/config/logs'),
};
```

- [ ] **Schritt 4: Committen**

```bash
git add app/src/api/clientApi.ts app/src/api/folderApi.ts app/src/api/settingsApi.ts
git commit -m "feat: add client, folder and settings API modules"
```

---

## Task 10: Layout & AuthGuard

**Files:**
- Create: `app/src/components/AuthGuard.tsx`
- Create: `app/src/components/AppLayout.tsx`

- [ ] **Schritt 1: AuthGuard.tsx erstellen**

```tsx
// app/src/components/AuthGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Schritt 2: AppLayout.tsx erstellen**

```tsx
// app/src/components/AppLayout.tsx
import { useState } from 'react';
import { Layout, Menu, Button, theme, Typography } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  ScanOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: '/portfolios', icon: <FolderOutlined />, label: 'Portfolios' },
  { key: '/exams', icon: <FileTextOutlined />, label: 'Examen' },
  { key: '/examinees', icon: <TeamOutlined />, label: 'Prüflinge' },
  { key: '/scans', icon: <ScanOutlined />, label: 'Scans' },
  { key: '/rawdata', icon: <DatabaseOutlined />, label: 'Rohdaten' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Einstellungen' },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ padding: '16px', color: 'white', fontWeight: 'bold', fontSize: collapsed ? 14 : 18 }}>
          {collapsed ? 'FT' : 'Flowti'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Abmelden
          </Button>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Schritt 3: Committen**

```bash
git add app/src/components/
git commit -m "feat: add AuthGuard and AppLayout components"
```

---

## Task 11: Login-Seite & Router-Setup

**Files:**
- Create: `app/src/pages/LoginPage.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Schritt 1: LoginPage.tsx erstellen**

```tsx
// app/src/pages/LoginPage.tsx
import { Form, Input, Button, Card, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

interface LoginForm {
  serverUrl: string;
  username: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { notification } = AntApp.useApp();

  const onFinish = (values: LoginForm) => {
    // Platzhalter: Token wird direkt als username:password gesetzt
    // Später durch echten OAuth2 Flow ersetzen
    const dummyToken = btoa(`${values.username}:${values.password}`);
    login(values.serverUrl, dummyToken);
    notification.success({ message: 'Angemeldet' });
    navigate('/portfolios');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>Flowti</Title>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item label="Server-URL" name="serverUrl" rules={[{ required: true, message: 'Bitte Server-URL eingeben' }]}>
            <Input placeholder="https://example.com/" />
          </Form.Item>
          <Form.Item label="Benutzername" name="username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Passwort" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Anmelden
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Schritt 2: App.tsx mit Router ersetzen**

```tsx
// app/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import deDE from 'antd/locale/de_DE';
import { AuthGuard } from './components/AuthGuard';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { PortfoliosPage } from './pages/PortfoliosPage';
import { ExamsPage } from './pages/ExamsPage';
import { ExamineesPage } from './pages/ExamineesPage';
import { ScansPage } from './pages/ScansPage';
import { RawdataPage } from './pages/RawdataPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <ConfigProvider locale={deDE}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Navigate to="/portfolios" replace />} />
              <Route path="portfolios" element={<PortfoliosPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="examinees" element={<ExamineesPage />} />
              <Route path="scans" element={<ScansPage />} />
              <Route path="rawdata" element={<RawdataPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/portfolios" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
```

- [ ] **Schritt 3: Build prüfen**

```bash
cd /run/media/cmoses-work/347519ad-6e34-46bc-9fa5-c0f878afd7cc/external/Projects/flowti/app
npm run build
```

Erwartete Ausgabe: Fehler bei fehlenden Page-Komponenten (noch nicht erstellt). Das ist normal — die Pages werden in den nächsten Tasks erstellt. Wenn der Fehler nur "Cannot find module './pages/XPage'" lautet, ist alles korrekt.

**Hinweis:** Falls TypeScript-Fehler durch fehlende Pages entstehen, erstelle vorab leere Platzhalter-Exports:
```bash
for page in Portfolios Exams Examinees Scans Rawdata Settings; do
  echo "export function ${page}Page() { return <div>${page}</div>; }" > app/src/pages/${page}Page.tsx
done
```

- [ ] **Schritt 4: Committen**

```bash
git add app/src/pages/LoginPage.tsx app/src/App.tsx
git commit -m "feat: add login page and router setup"
```

---

## Task 12: Portfolios-Seite

**Files:**
- Create: `app/src/pages/PortfoliosPage.tsx`

- [ ] **Schritt 1: PortfoliosPage.tsx erstellen**

Diese Seite zeigt die Portfolio-Liste und bei Auswahl einen Workflow-Tab mit Examen, Prüflingen, Scan-Upload und Export.

```tsx
// app/src/pages/PortfoliosPage.tsx
import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Space, App as AntApp,
  Tabs, Upload, Tag, Spin, Modal, Form, Input, Select,
} from 'antd';
import {
  ReloadOutlined, UploadOutlined, DownloadOutlined,
  UserAddOutlined, TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { portfolioApi } from '../api/portfolioApi';
import { examApi } from '../api/examApi';
import { Portfolio } from '../types/portfolio';
import { Exam } from '../types/exam';
import { Examinee } from '../types/examinee';
import { Scan } from '../types/scan';

const { Title, Text } = Typography;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PortfoliosPage() {
  const { notification } = AntApp.useApp();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Portfolio | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examinees, setExaminees] = useState<Examinee[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const page = await portfolioApi.getAll({ size: 100 });
      setPortfolios(page.content);
    } catch (e: any) {
      notification.error({ message: 'Fehler beim Laden der Portfolios', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPortfolios(); }, []);

  const selectPortfolio = async (p: Portfolio) => {
    setSelected(p);
    setTabLoading(true);
    try {
      const [examList, examineePage, scanPage] = await Promise.all([
        portfolioApi.getExams(p.id),
        portfolioApi.getExaminees(p.id, { size: 100 }),
        portfolioApi.getScansInvalid(p.id, { size: 100 }),
      ]);
      setExams(examList);
      setExaminees(examineePage.content);
      setScans(scanPage.content);
    } catch (e: any) {
      notification.error({ message: 'Fehler beim Laden', description: e.message });
    } finally {
      setTabLoading(false);
    }
  };

  const portfolioColumns: ColumnsType<Portfolio> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktion',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => selectPortfolio(record)}>Öffnen</Button>
      ),
    },
  ];

  const examColumns: ColumnsType<Exam> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Varianten', dataIndex: 'variants', key: 'variants' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Rohdaten',
      key: 'rawdata',
      render: (_, record) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={async () => {
            try {
              const blob = await examApi.downloadRawData(record.id, 'DEFAULT');
              triggerDownload(blob, `rawdata_${record.id}.zip`);
            } catch (e: any) {
              notification.error({ message: e.message });
            }
          }}
        >
          Export
        </Button>
      ),
    },
  ];

  const examineeColumns: ColumnsType<Examinee> = [
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Login', dataIndex: 'login', key: 'login' },
  ];

  const scanColumns: ColumnsType<Scan> = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    { title: 'Review', dataIndex: 'reviewState', key: 'reviewState' },
  ];

  if (selected) {
    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => setSelected(null)}>← Zurück</Button>
          <Title level={4} style={{ margin: 0 }}>{selected.name}</Title>
          <Tag>{selected.state}</Tag>
        </Space>

        <Spin spinning={tabLoading}>
          <Tabs
            items={[
              {
                key: 'exams',
                label: 'Examen',
                children: (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            const blob = await portfolioApi.downloadAnswerSheets(selected.id);
                            triggerDownload(blob, `answerSheets_${selected.id}.pdf`);
                          } catch (e: any) {
                            notification.error({ message: e.message });
                          }
                        }}
                      >
                        Antwortbögen herunterladen
                      </Button>
                    </Space>
                    <Table columns={examColumns} dataSource={exams} rowKey="id" size="small" />
                  </div>
                ),
              },
              {
                key: 'examinees',
                label: `Prüflinge (${examinees.length})`,
                children: (
                  <div>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        icon={<UserAddOutlined />}
                        onClick={async () => {
                          try {
                            await portfolioApi.generateExaminees(selected.id, 1);
                            const page = await portfolioApi.getExaminees(selected.id, { size: 100 });
                            setExaminees(page.content);
                            notification.success({ message: 'Prüfling generiert' });
                          } catch (e: any) {
                            notification.error({ message: e.message });
                          }
                        }}
                      >
                        Prüfling generieren
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            const blob = await portfolioApi.downloadExamineesExcel(selected.id);
                            triggerDownload(blob, `examinees_${selected.id}.csv`);
                          } catch (e: any) {
                            notification.error({ message: e.message });
                          }
                        }}
                      >
                        CSV Export
                      </Button>
                    </Space>
                    <Table columns={examineeColumns} dataSource={examinees} rowKey="id" size="small" />
                  </div>
                ),
              },
              {
                key: 'scans',
                label: 'Scan-Upload',
                children: (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Upload
                        multiple
                        accept=".pdf,.png,.jpg"
                        beforeUpload={() => false}
                        onChange={async ({ fileList }) => {
                          if (fileList.every((f) => f.status !== 'uploading')) {
                            const files = fileList.map((f) => f.originFileObj as File).filter(Boolean);
                            if (files.length === 0) return;
                            try {
                              await portfolioApi.uploadScans(selected.id, files);
                              notification.success({ message: `${files.length} Scan(s) hochgeladen` });
                            } catch (e: any) {
                              notification.error({ message: e.message });
                            }
                          }
                        }}
                      >
                        <Button icon={<UploadOutlined />}>Scans hochladen (PDF/Bild)</Button>
                      </Upload>
                      <Text type="secondary">Ungültige Scans:</Text>
                      <Table columns={scanColumns} dataSource={scans} rowKey="id" size="small" />
                    </Space>
                  </div>
                ),
              },
              {
                key: 'export',
                label: 'Export',
                children: (
                  <Space direction="vertical">
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          const blob = await portfolioApi.downloadArchive(selected.id);
                          triggerDownload(blob, `portfolio_${selected.id}.zip`);
                        } catch (e: any) {
                          notification.error({ message: e.message });
                        }
                      }}
                    >
                      Portfolio-Archiv (ZIP)
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          const blob = await portfolioApi.downloadTrainingData(selected.id);
                          triggerDownload(blob, `training_${selected.id}.zip`);
                        } catch (e: any) {
                          notification.error({ message: e.message });
                        }
                      }}
                    >
                      Trainingsdaten (ZIP)
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Portfolios</Title>
        <Button icon={<ReloadOutlined />} onClick={loadPortfolios} loading={loading}>
          Aktualisieren
        </Button>
      </Space>
      <Table
        columns={portfolioColumns}
        dataSource={portfolios}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/pages/PortfoliosPage.tsx
git commit -m "feat: add portfolios page with workflow tabs"
```

---

## Task 13: Examen-Seite

**Files:**
- Create: `app/src/pages/ExamsPage.tsx`

- [ ] **Schritt 1: ExamsPage.tsx erstellen**

```tsx
// app/src/pages/ExamsPage.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag, Upload } from 'antd';
import { ReloadOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { examApi } from '../api/examApi';
import { Exam } from '../types/exam';

const { Title } = Typography;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ExamsPage() {
  const { notification } = AntApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await examApi.getAll({ size: 100 });
      setExams(page.content);
    } catch (e: any) {
      notification.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnsType<Exam> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Varianten', dataIndex: 'variants', key: 'variants' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const blob = await examApi.downloadAllQuestionSheets(record.id);
                triggerDownload(blob, `questionsheets_${record.id}.zip`);
              } catch (e: any) { notification.error({ message: e.message }); }
            }}
          >
            Fragebögen
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const blob = await examApi.downloadRawData(record.id, 'DEFAULT');
                triggerDownload(blob, `rawdata_${record.id}.zip`);
              } catch (e: any) { notification.error({ message: e.message }); }
            }}
          >
            Rohdaten
          </Button>
          <Upload
            accept=".pdf"
            showUploadList={false}
            beforeUpload={(file) => {
              examApi.uploadQuestionSheet(record.id, 1, file)
                .then(() => notification.success({ message: 'Fragenbogen hochgeladen' }))
                .catch((e) => notification.error({ message: e.message }));
              return false;
            }}
          >
            <Button size="small" icon={<UploadOutlined />}>Fragenbogen hochladen</Button>
          </Upload>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Examen</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Table columns={columns} dataSource={exams} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/pages/ExamsPage.tsx
git commit -m "feat: add exams page"
```

---

## Task 14: Prüflinge-Seite

**Files:**
- Create: `app/src/pages/ExamineesPage.tsx`

- [ ] **Schritt 1: ExamineesPage.tsx erstellen**

```tsx
// app/src/pages/ExamineesPage.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Modal, Form, Input } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { examinerApi } from '../api/examinerApi';
import { actorApi } from '../api/actorApi';
import { Examiner, Actor } from '../types/examinee';
import { Tabs } from 'antd';

const { Title } = Typography;

export function ExamineesPage() {
  const { notification } = AntApp.useApp();
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [exPage, acPage] = await Promise.all([
        examinerApi.getAll({ size: 100 }),
        actorApi.getAll({ size: 100 }),
      ]);
      setExaminers(exPage.content);
      setActors(acPage.content);
    } catch (e: any) {
      notification.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const examinerColumns: ColumnsType<Examiner> = [
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Login', dataIndex: 'login', key: 'login' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Button size="small" danger onClick={async () => {
          try {
            await examinerApi.delete(record.id);
            setExaminers((prev) => prev.filter((e) => e.id !== record.id));
          } catch (e: any) { notification.error({ message: e.message }); }
        }}>Löschen</Button>
      ),
    },
  ];

  const actorColumns: ColumnsType<Actor> = [
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Login', dataIndex: 'login', key: 'login' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Button size="small" danger onClick={async () => {
          try {
            await actorApi.delete(record.id);
            setActors((prev) => prev.filter((a) => a.id !== record.id));
          } catch (e: any) { notification.error({ message: e.message }); }
        }}>Löschen</Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Prüfer & Akteure</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Tabs items={[
        {
          key: 'examiners',
          label: `Prüfer (${examiners.length})`,
          children: <Table columns={examinerColumns} dataSource={examiners} rowKey="id" loading={loading} size="small" />,
        },
        {
          key: 'actors',
          label: `Akteure (${actors.length})`,
          children: <Table columns={actorColumns} dataSource={actors} rowKey="id" loading={loading} size="small" />,
        },
      ]} />
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/pages/ExamineesPage.tsx
git commit -m "feat: add examinees page with examiner and actor tabs"
```

---

## Task 15: Scans-Seite

**Files:**
- Create: `app/src/pages/ScansPage.tsx`

- [ ] **Schritt 1: ScansPage.tsx erstellen**

```tsx
// app/src/pages/ScansPage.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { rawdataApi } from '../api/rawdataApi';
import { rawdataPaperbasedApi } from '../api/rawdataPaperbasedApi';
import { Rawdata } from '../types/scan';

const { Title } = Typography;

export function ScansPage() {
  const { notification } = AntApp.useApp();
  const [rawdata, setRawdata] = useState<Rawdata[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await rawdataApi.getAll({ size: 100 });
      setRawdata(page.content);
    } catch (e: any) {
      notification.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnsType<Rawdata> = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Typ', dataIndex: 'type', key: 'type', render: (t) => <Tag>{t}</Tag> },
    { title: 'Exam', dataIndex: ['exam', 'name'], key: 'exam' },
    { title: 'Prüfling', dataIndex: ['examinee', 'name'], key: 'examinee' },
    {
      title: 'Aktionen', key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            danger
            onClick={async () => {
              try {
                await rawdataApi.delete(record.id);
                setRawdata((prev) => prev.filter((r) => r.id !== record.id));
                notification.success({ message: 'Gelöscht' });
              } catch (e: any) { notification.error({ message: e.message }); }
            }}
          >
            Löschen
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Scans & Rohdaten</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Table columns={columns} dataSource={rawdata} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/pages/ScansPage.tsx
git commit -m "feat: add scans page"
```

---

## Task 16: Rohdaten-Seite

**Files:**
- Create: `app/src/pages/RawdataPage.tsx`

- [ ] **Schritt 1: RawdataPage.tsx erstellen**

```tsx
// app/src/pages/RawdataPage.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Typography, Space, App as AntApp, Tag, Select } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { examApi } from '../api/examApi';
import { Exam } from '../types/exam';

const { Title } = Typography;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const EXPORT_MODES = ['DEFAULT', 'CSV', 'ALL'];

export function RawdataPage() {
  const { notification } = AntApp.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportMode, setExportMode] = useState('DEFAULT');

  const load = async () => {
    setLoading(true);
    try {
      const page = await examApi.getAll({ size: 100 });
      setExams(page.content);
    } catch (e: any) {
      notification.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnsType<Exam> = [
    { title: 'Exam', dataIndex: 'name', key: 'name' },
    { title: 'Typ', dataIndex: 'type', key: 'type' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Export',
      key: 'export',
      render: (_, record) => (
        <Button
          icon={<DownloadOutlined />}
          size="small"
          onClick={async () => {
            try {
              const blob = await examApi.downloadRawData(record.id, exportMode);
              triggerDownload(blob, `rawdata_${record.name}_${exportMode}.zip`);
            } catch (e: any) { notification.error({ message: e.message }); }
          }}
        >
          Herunterladen
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Rohdaten-Export</Title>
        <Select value={exportMode} onChange={setExportMode} style={{ width: 140 }}>
          {EXPORT_MODES.map((m) => <Select.Option key={m} value={m}>{m}</Select.Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>
      <Table columns={columns} dataSource={exams} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add app/src/pages/RawdataPage.tsx
git commit -m "feat: add rawdata export page"
```

---

## Task 17: Einstellungen-Seite

**Files:**
- Create: `app/src/pages/SettingsPage.tsx`

- [ ] **Schritt 1: SettingsPage.tsx erstellen**

```tsx
// app/src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Typography, Space, App as AntApp, Tag, Descriptions } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '../api/userApi';
import { clientApi } from '../api/clientApi';
import { folderApi } from '../api/folderApi';
import { settingsApi } from '../api/settingsApi';
import { User, Client, Folder, CurrentUser } from '../types/user';

const { Title } = Typography;

export function SettingsPage() {
  const { notification } = AntApp.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [uPage, cPage, fList, cu] = await Promise.all([
        userApi.getAll({ size: 100 }),
        clientApi.getAll({ size: 100 }),
        folderApi.getAll(),
        settingsApi.getCurrentUser(),
      ]);
      setUsers(uPage.content);
      setClients(cPage.content);
      setFolders(fList);
      setCurrentUser(cu);
    } catch (e: any) {
      notification.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const userColumns: ColumnsType<User> = [
    { title: 'Benutzername', dataIndex: 'username', key: 'username' },
    { title: 'Vorname', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Nachname', dataIndex: 'lastName', key: 'lastName' },
    { title: 'E-Mail', dataIndex: 'email', key: 'email' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Button size="small" danger onClick={async () => {
          try {
            await userApi.delete(record.id);
            setUsers((p) => p.filter((u) => u.id !== record.id));
          } catch (e: any) { notification.error({ message: e.message }); }
        }}>Löschen</Button>
      ),
    },
  ];

  const clientColumns: ColumnsType<Client> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Alias', dataIndex: 'alias', key: 'alias' },
    { title: 'Status', dataIndex: 'state', key: 'state', render: (s) => <Tag>{s}</Tag> },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Button size="small" danger onClick={async () => {
          try {
            await clientApi.delete(record.id);
            setClients((p) => p.filter((c) => c.id !== record.id));
          } catch (e: any) { notification.error({ message: e.message }); }
        }}>Löschen</Button>
      ),
    },
  ];

  const folderColumns: ColumnsType<Folder> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Übergeordnet', dataIndex: ['parent', 'name'], key: 'parent' },
    {
      title: 'Aktion', key: 'action',
      render: (_, record) => (
        <Button size="small" danger onClick={async () => {
          try {
            await folderApi.delete(record.id);
            setFolders((p) => p.filter((f) => f.id !== record.id));
          } catch (e: any) { notification.error({ message: e.message }); }
        }}>Löschen</Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Einstellungen</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Aktualisieren</Button>
      </Space>

      {currentUser && (
        <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Angemeldet als">{currentUser.firstName} {currentUser.lastName} ({currentUser.username})</Descriptions.Item>
          <Descriptions.Item label="Rollen">{currentUser.roles?.join(', ')}</Descriptions.Item>
        </Descriptions>
      )}

      <Tabs items={[
        {
          key: 'users',
          label: `Benutzer (${users.length})`,
          children: (
            <div>
              <Space style={{ marginBottom: 12 }}>
                <Button icon={<PlusOutlined />} onClick={async () => {
                  try {
                    const u = await userApi.create();
                    setUsers((p) => [...p, u]);
                    notification.success({ message: 'Benutzer erstellt' });
                  } catch (e: any) { notification.error({ message: e.message }); }
                }}>Erstellen</Button>
              </Space>
              <Table columns={userColumns} dataSource={users} rowKey="id" size="small" loading={loading} />
            </div>
          ),
        },
        {
          key: 'clients',
          label: `Clients (${clients.length})`,
          children: (
            <div>
              <Space style={{ marginBottom: 12 }}>
                <Button icon={<PlusOutlined />} onClick={async () => {
                  try {
                    const list = await clientApi.generate(1);
                    setClients((p) => [...p, ...list]);
                    notification.success({ message: 'Client generiert' });
                  } catch (e: any) { notification.error({ message: e.message }); }
                }}>Generieren</Button>
              </Space>
              <Table columns={clientColumns} dataSource={clients} rowKey="id" size="small" loading={loading} />
            </div>
          ),
        },
        {
          key: 'folders',
          label: `Ordner (${folders.length})`,
          children: <Table columns={folderColumns} dataSource={folders} rowKey="id" size="small" loading={loading} />,
        },
      ]} />
    </div>
  );
}
```

- [ ] **Schritt 2: Finaler Build-Check**

```bash
cd /run/media/cmoses-work/347519ad-6e34-46bc-9fa5-c0f878afd7cc/external/Projects/flowti/app
npm run build
```

Erwartete Ausgabe: Build erfolgreich, keine TypeScript-Fehler.

- [ ] **Schritt 3: Committen**

```bash
git add app/src/pages/SettingsPage.tsx
git commit -m "feat: add settings page with users, clients and folders"
```

---

## Abschluss-Checkliste

Nach Abschluss aller Tasks prüfen:

- [ ] `npm run build` läuft ohne Fehler
- [ ] Login-Seite rendert mit Server-URL, User, Passwort
- [ ] Navigation zwischen allen 6 Seiten funktioniert
- [ ] Nicht-authentifizierter Zugriff leitet zu `/login` weiter
- [ ] Portfolio-Liste wird geladen
- [ ] Exam-Liste wird geladen
- [ ] Antwortbogen-Download funktioniert (setzt authentifizierten Backend-Zugang voraus)
