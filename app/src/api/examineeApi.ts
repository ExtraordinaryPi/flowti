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
