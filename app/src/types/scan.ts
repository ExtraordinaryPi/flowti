import { EntityReduced } from './common';

export interface Scan {
  id: number;
  state: string;
  reviewState: string;
  exam?: EntityReduced;
  examinee?: EntityReduced;
  variant?: number;
  pageCount?: number;
  created?: string;
}

export interface ScanRequest {
  state?: string;
  reviewState?: string;
  examineeId?: number;
  examId?: number;
  variant?: number;
}

export interface Rawdata {
  id: number;
  type: string;
  exam?: EntityReduced;
  examinee?: EntityReduced;
  created?: string;
}

export interface RawdataRequest {
  type?: string;
  examId?: number;
  examineeId?: number;
}
