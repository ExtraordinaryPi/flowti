import { put, del } from './client';
import {
  ExamineeExamAssociation,
  ExamineeExamAssociationRequest,
  ExaminerExamAssociation,
  ExaminerExamAssociationRequest,
} from '../types/exam';

export const examineeExamAssociationApi = {
  upsert: (data: ExamineeExamAssociationRequest) =>
    put<ExamineeExamAssociation>('/rest/app/examineeExamAssociation/', data),

  delete: (data: ExamineeExamAssociationRequest) =>
    del<void>('/rest/app/examineeExamAssociation/', data),
};

export const examinerExamAssociationApi = {
  upsert: (data: ExaminerExamAssociationRequest) =>
    put<ExaminerExamAssociation>('/rest/app/examinerExamAssociation/', data),

  delete: (data: ExaminerExamAssociationRequest) =>
    del<void>('/rest/app/examinerExamAssociation/', data),
};
