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
