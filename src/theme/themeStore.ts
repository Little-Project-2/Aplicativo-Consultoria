import { create } from 'zustand';

import { DEFAULT_THEME, readStoredTheme, resolveThemeName, type ThemeName, writeStoredTheme } from './theme';

type ThemeStore = {
  hydrated: boolean;
  theme: ThemeName;
  hydrateTheme: () => void;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  hydrated: false,
  theme: DEFAULT_THEME,
  hydrateTheme: () => {
    set({
      hydrated: true,
      theme: readStoredTheme(getBrowserStorage())
    });
  },
  setTheme: (theme) => {
    const nextTheme = writeStoredTheme(resolveThemeName(theme), getBrowserStorage());
    set({ hydrated: true, theme: nextTheme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'fitness-green' ? 'solar-ember' : 'fitness-green';
    get().setTheme(nextTheme);
  }
}));
