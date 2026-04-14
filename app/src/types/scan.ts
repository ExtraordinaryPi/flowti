import { EntityReduced } from './common';

export interface PortfolioScan {
  id: number;
  state: string;
  name?: string;
  page?: number;
  variant?: number;
  exam?: EntityReduced;
  examinee?: EntityReduced;
}

export interface MarkerBarcodeEntry {
  x: number;
  y: number;
  value: string;
  type: 'EXAM' | 'EXAMINEE' | 'UPPER_LEFT' | 'UPPER_RIGHT' | 'LOWER_LEFT' | 'LOWER_RIGHT';
}

export interface ScanQuestionElement {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  questionType: string;
  state: string;
  itemId: number;
  value: number;
  position: number;
}

export interface MarkerThresholds {
  markerOffsetThreshold: number;
  markerRatioThresholdLow: number;
  markerRatioThresholdHigh: number;
  markerAreaThresholdLow: number;
  markerRectanglenessThreshold: number;
}

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
