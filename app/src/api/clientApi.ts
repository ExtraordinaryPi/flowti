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
