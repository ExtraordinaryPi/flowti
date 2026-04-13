export interface Examinee {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  attributes?: Record<string, string>;
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
