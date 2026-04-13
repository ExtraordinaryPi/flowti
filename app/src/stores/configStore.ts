import { create } from 'zustand';

interface ConfigState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
