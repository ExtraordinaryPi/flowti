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
