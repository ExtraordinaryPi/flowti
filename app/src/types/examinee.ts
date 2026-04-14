export interface Examinee {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  identifier?: string;
  attributes?: Record<string, string>;
  /** examId → Variante (1-basiert) */
  examVariants?: Record<number, number>;
}

export interface ExamineeRequest {
  firstName: string;
  lastName: string;
  login?: string;
  attributes?: Record<string, string>;
}

export interface Examiner {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  attributes?: Record<string, string>;
}

export interface ExaminerRequest {
  firstName: string;
  lastName: string;
  login?: string;
  attributes?: Record<string, string>;
}

export interface Actor {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
}

export interface ActorRequest {
  firstName: string;
  lastName: string;
  login?: string;
}
