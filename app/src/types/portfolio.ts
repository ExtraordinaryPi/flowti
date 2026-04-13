import { EntityReduced } from './common';

export interface Portfolio {
  id: number;
  name: string;
  state: string;
  config: string[];
  folder?: EntityReduced;
  description?: string;
  lastUpdate?: string;
}

export interface PortfolioRequest {
  name: string;
  state?: string;
  config?: string[];
  folderId?: number;
  description?: string;
}

export interface PortfolioState {
  id: number;
  name: string;
  state: string;
}
