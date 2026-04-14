export type CheckValue = 'UNCHECKED' | 'CHECKED' | 'CORRECTED';

export interface ExamChecked {
  id: number;
  value: CheckValue;
  /** Base64-kodiertes PNG des Kreuzchens */
  image: string;
}
