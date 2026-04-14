import { get, post, postForm, put, del, downloadBlob } from './client';
import { Scan, MarkerBarcodeEntry, ScanQuestionElement, MarkerThresholds, ScanEntryValue } from '../types/scan';

const BASE = '/rest/app/rawdataPaperbased';

export const rawdataPaperbasedApi = {
  getImage: (id: number) =>
    downloadBlob(`${BASE}/${id}`),

  getThumbnail: (id: number) =>
    downloadBlob(`${BASE}/${id}/thumbnail`),

  reprocess: (id: number, mode: string) =>
    post<Scan>(`${BASE}/${id}/${mode}`),

  reupload: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('filename', file.name);
    return postForm<Scan>(`${BASE}/reupload/${id}`, form);
  },

  flip: (id: number) =>
    put<void>(`${BASE}/${id}/flip`),

  delete: (id: number) =>
    del<void>(`${BASE}/${id}`),

  getMarkerBarcodeEntries: (id: number) =>
    get<MarkerBarcodeEntry[]>(`${BASE}/${id}/markerBarcodeEntries`),

  getBoundElements: (id: number) =>
    get<ScanQuestionElement[]>(`${BASE}/${id}/boundElementsNoWarp`),

  updateMarkerThresholds: (id: number, thresholds: MarkerThresholds) =>
    put<void>(`/rest/app/scan/${id}/updateMarkerThresholds`, thresholds),

  applyWarp: (id: number, warp: { warpX: number; warpY: number }) =>
    put<void>(`${BASE}/${id}/warp`, warp),

  getEntryValues: (id: number) =>
    get<ScanEntryValue[]>(`${BASE}/${id}/entryValues`, { page: 1, limit: 500 }),

  updateEntryValue: (scanId: number, entryValueId: number, data: { value: string }) =>
    put<void>(`${BASE}/${scanId}/entryValues/${entryValueId}`, { id: entryValueId, ...data }),
};
