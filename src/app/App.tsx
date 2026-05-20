import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

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

  const hideAuth = useCallback(() => {
    flushSync(() => {
      setAuthVisible(false);
    });
  }, []);

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
    hideAuth();
    await goToProfileCreate();
  }, [hideAuth]);

  const routeAuthenticatedUser = useCallback(async (user: User) => {
    try {
      const routeAuthenticatedSessionUser = await waitForLegacyAuthRouter();
      hideAuth();
      await routeAuthenticatedSessionUser(user, { force: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel abrir seu painel.';
      setBridgeFeedback({ message, type: 'error' });
      setAuthView('login');
      setAuthVisible(true);
      throw error;
    }
  }, [hideAuth]);

  useEffect(() => {
    window.__CONSULTORIA_REACT_AUTH__ = {
      hide: hideAuth,
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
  }, [authView, authVisible, hideAuth, showAuthHome, showAuthLogin]);

  return (
    <>
      {authVisible ? (
        <AuthExperience
          externalFeedback={bridgeFeedback}
          legacyReady={legacyReady}
          onHideAuth={hideAuth}
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
