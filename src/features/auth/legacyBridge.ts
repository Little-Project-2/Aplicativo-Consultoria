import type { User } from '@supabase/supabase-js';

export type AuthView = 'home' | 'login';
export type AuthFeedbackType = 'error' | 'success' | 'info' | 'warning';

export type AuthFeedback = {
  message: string;
  type: AuthFeedbackType;
};

type LegacyRouterOptions = {
  force?: boolean;
};

declare global {
  interface Window {
    __CONSULTORIA_REACT_AUTH__?: {
      hide: () => void;
      isHomeVisible: () => boolean;
      setFeedback: (message: string, type?: AuthFeedbackType) => void;
      showHome: () => void;
      showLogin: (feedback?: AuthFeedback) => void;
    };
    goToProfileCreate?: () => Promise<void> | void;
    routeAuthenticatedSessionUser?: (user: User, options?: LegacyRouterOptions) => Promise<void>;
    setLoginRoleIntent?: (role: 'trainer' | 'student', options?: { silent?: boolean }) => string;
  }
}

export function isRecoveryHashActive() {
  const hash = String(window.location.hash || '').replace(/^#/, '');
  const params = new URLSearchParams(hash);

  return params.get('type')?.toLowerCase() === 'recovery' && Boolean(params.get('access_token'));
}

function waitForWindowFunction<T extends (...args: never[]) => unknown>(
  getter: () => T | undefined,
  timeoutMs: number,
  label: string
): Promise<T> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const fn = getter();
      if (typeof fn === 'function') {
        resolve(fn);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`${label} nao ficou pronto a tempo.`));
        return;
      }

      window.setTimeout(tick, 50);
    };

    tick();
  });
}

export function waitForLegacySignup(timeoutMs = 5_000) {
  return waitForWindowFunction(() => window.goToProfileCreate, timeoutMs, 'Cadastro legado');
}

export function waitForLegacyAuthRouter(timeoutMs = 5_000) {
  return waitForWindowFunction(
    () => window.routeAuthenticatedSessionUser,
    timeoutMs,
    'Roteamento legado de autenticacao'
  );
}
