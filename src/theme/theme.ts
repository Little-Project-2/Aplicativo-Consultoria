export const themeNames = ['fitness-green', 'solar-ember'] as const;

export type ThemeName = (typeof themeNames)[number];

export const DEFAULT_THEME: ThemeName = 'fitness-green';
export const THEME_STORAGE_KEY = 'consultoria-theme-v1';

export type ThemeMeta = {
  name: ThemeName;
  label: string;
  shortLabel: string;
  metaColor: string;
};

export const themeMeta: Record<ThemeName, ThemeMeta> = {
  'fitness-green': {
    name: 'fitness-green',
    label: 'Verde atual',
    shortLabel: 'Verde',
    metaColor: '#98E52B'
  },
  'solar-ember': {
    name: 'solar-ember',
    label: 'Dourado premium',
    shortLabel: 'Dourado',
    metaColor: '#D4AF37'
  }
};

export function resolveThemeName(value: unknown): ThemeName {
  return themeNames.includes(value as ThemeName) ? (value as ThemeName) : DEFAULT_THEME;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readStoredTheme(storage: ReadableStorage | null | undefined): ThemeName {
  if (!storage) return DEFAULT_THEME;

  try {
    return resolveThemeName(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(theme: ThemeName, storage: WritableStorage | null | undefined): ThemeName {
  const nextTheme = resolveThemeName(theme);

  if (!storage) return nextTheme;

  try {
    storage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Storage can be blocked in private contexts; the in-memory store still keeps the UI usable.
  }

  return nextTheme;
}
