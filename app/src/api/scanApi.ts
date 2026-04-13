import { put } from './client';
import { Scan, ScanRequest } from '../types/scan';

const BASE = '/rest/app/scan';

export const scanApi = {
  update: (id: number, data: ScanRequest) =>
    put<Scan>(`${BASE}/${id}`, data),
};
