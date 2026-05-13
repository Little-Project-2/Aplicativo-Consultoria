export type AppConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type ConfigEnv = Record<string, string | boolean | undefined>;

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

export function normalizeAppConfig(config: Partial<AppConfig> | undefined, env: ConfigEnv = {}): AppConfig {
  const envSupabaseUrl = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL : '';
  const envAnonKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY : '';
  const envPublishableKey =
    typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string' ? env.VITE_SUPABASE_PUBLISHABLE_KEY : '';

  return {
    supabaseUrl: String(config?.supabaseUrl || envSupabaseUrl || '').trim(),
    supabaseAnonKey: String(config?.supabaseAnonKey || envAnonKey || envPublishableKey || '').trim()
  };
}

export function getAppConfig(): AppConfig {
  return normalizeAppConfig(window.__APP_CONFIG__, import.meta.env);
}
