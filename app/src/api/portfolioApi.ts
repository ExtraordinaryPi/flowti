import { get, post, postForm, put, del, putForm, downloadBlob } from './client';
import { Page, PageParams } from '../types/common';
import { Portfolio, PortfolioRequest, PortfolioState } from '../types/portfolio';
import { Exam } from '../types/exam';
import { Examinee, Examiner } from '../types/examinee';
import { PortfolioScan, MarkerThresholds, Scan } from '../types/scan';
import { ExamChecked, CheckValue } from '../types/examChecked';

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
    get<PortfolioScan[]>(`${BASE}/${id}/validRawdataPaperbased`),

  updateValidScan: (portfolioId: number, scanId: number, data: { scanReviewState: string }) =>
    put<PortfolioScan>(`${BASE}/${portfolioId}/validRawdataPaperbased/${scanId}`, { id: scanId, ...data }),

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

  shuffleUnassigned: (id: number) =>
    post<Portfolio>(`${BASE}/${id}/shuffleUnassigned`),

  reshuffleSameVariant: (id: number) =>
    post<Portfolio>(`${BASE}/${id}/reshuffleSameVariant`),

  downloadAnswerSheets: (portfolioId: number) =>
    downloadBlob(`${BASE}/${portfolioId}/generatedAnswerSheets`),

  downloadAnswerSheetPreview: (portfolioId: number) =>
    downloadBlob(`${BASE}/${portfolioId}/answerSheetPreview`),

  downloadQuestionSheetPreview: (portfolioId: number) =>
    downloadBlob(`${BASE}/${portfolioId}/questionSheetPreview`),

  downloadCoverPagePreview: (portfolioId: number) =>
    downloadBlob(`${BASE}/${portfolioId}/coverPagePreview`),

  downloadArchive: (id: number) =>
    downloadBlob(`${BASE}/${id}/archive`),

  downloadExamineesExcel: (id: number) =>
    downloadBlob(`${BASE}/${id}/examineesExcel`),

  downloadTrainingData: (id: number) =>
    downloadBlob(`${BASE}/${id}/trainingData`),

  uploadTrainingData: (id: number) =>
    post<void>(`${BASE}/${id}/trainingData/upload`),

  uploadCoverPageLogo: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return postForm<void>(`${BASE}/${id}/coverPageLogo`, form);
  },

  deleteCoverPageLogo: (id: number) =>
    del<void>(`${BASE}/${id}/coverPageLogo`),

  uploadAnswerSheetLogo: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return postForm<void>(`${BASE}/${id}/answerSheetLogo`, form);
  },

  deleteAnswerSheetLogo: (id: number) =>
    del<void>(`${BASE}/${id}/answerSheetLogo`),

  reloadQuestionSheets: (id: number) =>
    post<void>(`${BASE}/${id}/reloadQuestionSheets`),

  downloadRegeneratedAnswerSheets: (id: number) =>
    downloadBlob(`${BASE}/${id}/regeneratedAnswerSheets`),

  importCsv: (portfolioId: number, data: unknown[]) =>
    post<void>(`${BASE}/importCsv/${portfolioId}`, data),

  // Gibt Array von Objekten zurück – Keys = CSV-Spaltenname, Value = Zellwert
  importTable: (formData: FormData) =>
    putForm<Record<string, string>[]>(`${BASE}/importTable`, formData),

  importQti: (formData: FormData) =>
    postForm<Portfolio>(`${BASE}/qti`, formData),

  importIms: (formData: FormData) =>
    postForm<Portfolio>(`${BASE}/ims`, formData),

  getImsExamList: () =>
    get<{ id: number; name: string; date: string }[]>(`${BASE}/imsExamList`),

  getAllScans: async (id: number, params?: PageParams): Promise<Page<PortfolioScan>> => {
    const result = await get<Page<PortfolioScan> | PortfolioScan[]>(`${BASE}/${id}/rawdataPaperbased`, params);
    if (Array.isArray(result)) {
      return { content: result, totalElements: result.length, totalPages: 1, number: 0, size: result.length, first: true, last: true, numberOfElements: result.length, empty: result.length === 0 };
    }
    return { ...result, content: result.content ?? [] };
  },

  reprocessInvalid: (id: number, mode: string) =>
    post<void>(`/rest/app/rawdataPaperbased/reprocessNonValid/${id}/${mode}`),

  applyThresholdsAll: (id: number, thresholds: MarkerThresholds) =>
    put<void>(`${BASE}/${id}/changeMarkerThresholds`, thresholds),

  applyThresholdsInvalid: (id: number, thresholds: MarkerThresholds) =>
    put<void>(`${BASE}/${id}/changeMarkerThresholdsInvalid`, thresholds),

  applyWarpAll: (id: number, warp: { warpX: number; warpY: number }) =>
    put<void>(`${BASE}/${id}/warp`, warp),

  getChecked: (id: number, params?: { value?: string; page?: number; limit?: number }) => {
    const { value, page = 1, limit = 200 } = params ?? {};
    const filter = value ? JSON.stringify([{ property: 'value', value }]) : undefined;
    return get<Page<ExamChecked>>(`${BASE}/${id}/checked`, {
      page,
      start: (page - 1) * limit,
      limit,
      ...(filter ? { filter } : {}),
    });
  },

  updateChecked: (id: number, examCheckedId: number, data: { value: CheckValue }) =>
    put<ExamChecked>(`${BASE}/${id}/checked/${examCheckedId}`, { id: examCheckedId, ...data }),

  changeCheckMarkPage: (id: number, value: CheckValue, entryIds: number[]) =>
    put<void>(`${BASE}/${id}/changeCheckMarkPage/${value}`, entryIds),
};
