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
