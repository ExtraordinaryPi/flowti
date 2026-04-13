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
