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
