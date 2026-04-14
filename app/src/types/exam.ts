import { EntityReduced } from './common';

export interface ExamConfig {
  id: number;
  agreementConfirmation?: string;
  aacAsam?: string;
  language?: string;
  answerSelection?: string;
  lmMinChars?: number;
  screenshotUpload?: string;
  color?: string;
  hasPin?: boolean;
  hasMasterPin?: boolean;
  pin?: string;
  masterPin?: string;
  allowEnroll?: boolean;
  enrollKey?: string;
  shuffleQuestions?: boolean;
  startableAtDate?: string;
  startableAtTime?: string;
  endDate?: string | null;
  endTime?: string | null;
  pointsInList?: boolean;
}

export interface Exam {
  id: number;
  // Felder aus der API-Antwort
  title?: string;
  name?: string;        // Fallback falls title fehlt
  type?: string;        // Fallback
  examType?: string;
  state?: string;
  introduction?: string;
  author?: string;
  imsId?: string;
  imsEntityId?: string;
  examDate?: string;
  headLine?: string;
  subHeadLine?: string;
  variants?: number;
  duration?: number;
  answerPermutation?: boolean;
  secondLevelNumbering?: boolean;
  totalQuestions?: number;
  totalItems?: number;
  totalPoints?: string | number;
  totalExamAnswerSheets?: number | null;
  exported?: boolean;
  description?: string;
  portfolio?: EntityReduced;
  examConfig?: ExamConfig;
  questionSheets?: unknown[];
  attachments?: unknown[];
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
