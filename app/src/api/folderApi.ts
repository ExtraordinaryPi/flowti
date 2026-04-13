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
