import { create } from 'zustand';

type AppShellState = {
  legacyReady: boolean;
  setLegacyReady: (ready: boolean) => void;
};

export const useAppShellStore = create<AppShellState>((set) => ({
  legacyReady: false,
  setLegacyReady: (ready) => set({ legacyReady: ready })
}));
