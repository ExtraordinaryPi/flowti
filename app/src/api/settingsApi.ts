import { get, put } from './client';
import { CurrentUser } from '../types/user';

export const settingsApi = {
  getCurrentUser: () =>
    get<CurrentUser>('/rest/app/session/currentUser'),

  getConfig: () =>
    get<Record<string, string>>('/rest/app/session/config'),

  getAbout: () =>
    get<Record<string, string>>('/rest/app/config/about'),

  reindex: () =>
    put<void>('/rest/app/config/reindex'),

  downloadLogs: () =>
    get<unknown>('/rest/app/config/logs'),
};
