import { EntityReduced } from './common';

export interface PortfolioScan {
  id: number;
  scanState: string;
  scanReviewState?: string;
  name?: string;
  nameReduced?: string;
  page?: number;
  variant?: number;
  examId?: number;
  examineeId?: number;
  examineeIdentifier?: string;
  examineeFirstName?: string;
  examineeLastName?: string;
  problemCount?: number;
}

export interface ScanEntryValue {
  id: number;
  value: string;
  computedValue?: string;
  confidence?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  representationType: string;
  questionElementId?: number;
  position?: number;
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
