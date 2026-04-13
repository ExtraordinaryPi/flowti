import { post, postForm, put, del, downloadBlob } from './client';
import { Scan } from '../types/scan';

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
};
