import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      isDarkMode: true,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    { name: 'flowti-config' }
  )
);
