import { describe, expect, it } from 'vitest';

import { normalizeAppConfig } from './appConfig';

describe('normalizeAppConfig', () => {
  it('prefers explicit app config over Vite environment values', () => {
    const config = normalizeAppConfig(
      {
        supabaseUrl: ' https://example.supabase.co ',
        supabaseAnonKey: ' anon-key '
      },
      {
        VITE_SUPABASE_URL: 'https://env.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'env-key'
      }
    );

    expect(config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key'
    });
  });

  it('falls back to Vite environment values during local development', () => {
    const config = normalizeAppConfig(undefined, {
      VITE_SUPABASE_URL: 'https://env.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
    });

    expect(config).toEqual({
      supabaseUrl: 'https://env.supabase.co',
      supabaseAnonKey: 'publishable-key'
    });
  });
});
