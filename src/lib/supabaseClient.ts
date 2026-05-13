import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getAppConfig } from './appConfig';

type SupabaseStatusReason =
  | 'ok'
  | 'missing_config'
  | 'missing_url'
  | 'invalid_url'
  | 'missing_anon_key'
  | 'init_failed';

type SupabaseStatus = {
  ready: boolean;
  reason: SupabaseStatusReason;
  message: string;
  details: {
    hasConfigObject: boolean;
    hasUrl: boolean;
    hasAnonKey: boolean;
  };
};

declare global {
  interface Window {
    supabase: SupabaseClient | null;
    __SUPABASE_STATUS__?: SupabaseStatus;
  }
}

let client: SupabaseClient | null = null;

function createStorageAdapter(): Storage {
  const memoryStore = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return memoryStore.size;
    },
    clear: () => memoryStore.clear(),
    getItem: (key) => memoryStore.get(String(key)) ?? null,
    key: (index) => Array.from(memoryStore.keys())[index] ?? null,
    removeItem: (key) => {
      memoryStore.delete(String(key));
    },
    setItem: (key, value) => {
      memoryStore.set(String(key), String(value));
    }
  };

  try {
    const testKey = '__consultoria_supabase__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

function isLikelyValidUrl(value: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function setSupabaseStatus(reason: SupabaseStatusReason, message: string, config = getAppConfig()) {
  const status: SupabaseStatus = {
    ready: reason === 'ok',
    reason,
    message,
    details: {
      hasConfigObject: Boolean(window.__APP_CONFIG__),
      hasUrl: Boolean(config.supabaseUrl),
      hasAnonKey: Boolean(config.supabaseAnonKey)
    }
  };
  window.__SUPABASE_STATUS__ = status;
  return status;
}

export function getSupabaseClient() {
  if (client) return client;

  const config = getAppConfig();

  if (!window.__APP_CONFIG__ && !config.supabaseUrl && !config.supabaseAnonKey) {
    setSupabaseStatus('missing_config', 'Supabase indisponivel: configuracao ausente.', config);
    return null;
  }

  if (!config.supabaseUrl) {
    setSupabaseStatus('missing_url', 'Supabase indisponivel: supabaseUrl nao configurada.', config);
    return null;
  }

  if (!isLikelyValidUrl(config.supabaseUrl)) {
    setSupabaseStatus('invalid_url', 'Supabase indisponivel: supabaseUrl invalida.', config);
    return null;
  }

  if (!config.supabaseAnonKey) {
    setSupabaseStatus('missing_anon_key', 'Supabase indisponivel: supabaseAnonKey nao configurada.', config);
    return null;
  }

  try {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createStorageAdapter()
      }
    });
    setSupabaseStatus('ok', 'Supabase inicializado com sucesso.', config);
    return client;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';
    setSupabaseStatus('init_failed', `Supabase indisponivel: falha ao criar cliente (${message}).`, config);
    return null;
  }
}

export function exposeSupabaseClient() {
  window.supabase = getSupabaseClient();
  return window.supabase;
}
