import { EntityReduced } from './common';

export interface Exam {
  id: number;
  name: string;
  type: string;
  state: string;
  variants: number;
  portfolio?: EntityReduced;
  description?: string;
}

export interface ExamRequest {
  name: string;
  type?: string;
  state?: string;
  variants?: number;
  description?: string;
}

export interface ExamineeExamAssociation {
  id: number;
  examinee: EntityReduced;
  exam: EntityReduced;
  variant?: number;
}

export interface ExamineeExamAssociationRequest {
  examineeId: number;
  examId: number;
  variant?: number;
}

export interface ExaminerExamAssociation {
  id: number;
  examiner: EntityReduced;
  exam: EntityReduced;
}

export interface ExaminerExamAssociationRequest {
  examinerId: number;
  examId: number;
}
