import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  serverUrl: string;
  isAuthenticated: boolean;
  login: (serverUrl: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      serverUrl: '',
      isAuthenticated: false,
      login: (serverUrl, token) =>
        set({ token, serverUrl, isAuthenticated: true }),
      logout: () =>
        set({ token: null, isAuthenticated: false }),
    }),
    { name: 'flowti-auth' }
  )
);
