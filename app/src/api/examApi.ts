import { get, postForm, put, del, downloadBlob } from './client';
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
