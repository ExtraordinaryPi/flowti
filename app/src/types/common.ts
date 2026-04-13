export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  empty: boolean;
}

export interface ApiError {
  code: string;
  title: string;
}

export interface EntityReduced {
  id: number;
  name: string;
}

export interface EntityShare {
  id: number;
  accessLevel: string;
  entity?: EntityReduced;
}

export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
}
