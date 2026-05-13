import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, readStoredTheme, THEME_STORAGE_KEY, writeStoredTheme } from './theme';

function createMemoryStorage(initialValue?: string) {
  const store = new Map<string, string>();
  if (initialValue) store.set(THEME_STORAGE_KEY, initialValue);

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    }
  };
}

describe('theme persistence', () => {
  it('falls back to the green theme for missing or invalid values', () => {
    expect(readStoredTheme(null)).toBe(DEFAULT_THEME);
    expect(readStoredTheme(createMemoryStorage('purple-rain'))).toBe(DEFAULT_THEME);
  });

  it('persists and reads the golden premium theme', () => {
    const storage = createMemoryStorage();

    writeStoredTheme('solar-ember', storage);

    expect(readStoredTheme(storage)).toBe('solar-ember');
  });
});
