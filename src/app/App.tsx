import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { AuthExperience } from '../features/auth/AuthExperience';
import type { AuthFeedback, AuthFeedbackType, AuthView } from '../features/auth/legacyBridge';
import { isRecoveryHashActive, waitForLegacyAuthRouter, waitForLegacySignup } from '../features/auth/legacyBridge';
import { useAppShellStore } from '../store/appShellStore';
import { LegacyShell } from './LegacyShell';

function getInitialAuthView(): AuthView {
  return isRecoveryHashActive() ? 'login' : 'home';
}

export function App() {
  const legacyReady = useAppShellStore((state) => state.legacyReady);
  const [authVisible, setAuthVisible] = useState(true);
  const [authView, setAuthView] = useState<AuthView>(() => getInitialAuthView());
  const [bridgeFeedback, setBridgeFeedback] = useState<AuthFeedback | null>(null);

  const showAuthHome = useCallback(() => {
    setBridgeFeedback(null);
    setAuthView('home');
    setAuthVisible(true);
  }, []);

  const showAuthLogin = useCallback((feedback?: AuthFeedback) => {
    setBridgeFeedback(feedback?.message ? feedback : null);
    setAuthView('login');
    setAuthVisible(true);
  }, []);

  const openLegacySignup = useCallback(async () => {
    const goToProfileCreate = await waitForLegacySignup();
    setAuthVisible(false);
    await goToProfileCreate();
  }, []);

  const routeAuthenticatedUser = useCallback(async (user: User) => {
    try {
      const routeAuthenticatedSessionUser = await waitForLegacyAuthRouter();
      setAuthVisible(false);
      await routeAuthenticatedSessionUser(user, { force: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel abrir seu painel.';
      setBridgeFeedback({ message, type: 'error' });
      setAuthView('login');
      setAuthVisible(true);
      throw error;
    }
  }, []);

  useEffect(() => {
    window.__CONSULTORIA_REACT_AUTH__ = {
      hide: () => setAuthVisible(false),
      isHomeVisible: () => authVisible && authView === 'home',
      setFeedback: (message: string, type: AuthFeedbackType = 'info') => {
        setBridgeFeedback(message ? { message, type } : null);
        setAuthView('login');
        setAuthVisible(true);
      },
      showHome: showAuthHome,
      showLogin: showAuthLogin
    };

    return () => {
      delete window.__CONSULTORIA_REACT_AUTH__;
    };
  }, [authView, authVisible, showAuthHome, showAuthLogin]);

  return (
    <>
      {authVisible ? (
        <AuthExperience
          externalFeedback={bridgeFeedback}
          legacyReady={legacyReady}
          onOpenLegacySignup={openLegacySignup}
          onRouteAuthenticatedUser={routeAuthenticatedUser}
          onViewChange={setAuthView}
          view={authView}
        />
      ) : null}
      <div className={authVisible ? 'legacy-shell-hidden' : 'legacy-shell-visible'}>
        <LegacyShell />
      </div>
    </>
  );
}
