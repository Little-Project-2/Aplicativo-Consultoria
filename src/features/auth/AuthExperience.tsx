import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '../../lib/supabaseClient';
import { themeMeta } from '../../theme/theme';
import { useThemeStore } from '../../theme/themeStore';
import { getAuthErrorMessage, EMAIL_PATTERN, getSupabaseUnavailableMessage } from './authMessages';
import type { AuthFeedback, AuthView } from './legacyBridge';
import { isRecoveryHashActive } from './legacyBridge';
import { AuthCard } from './components/AuthCard';
import { AuthField } from './components/AuthField';
import { BrandMark } from './components/BrandMark';
import { Button } from './components/Button';
import { RoleSelector } from './components/RoleSelector';
import { ThemeToggle } from './components/ThemeToggle';
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, GoogleIcon, LockIcon, MailIcon } from './components/icons';

type LoginRole = 'trainer' | 'student';
type LoadingAction = 'login' | 'google' | 'reset' | 'resend' | 'recovery' | 'signup' | null;

type AuthExperienceProps = {
  externalFeedback: AuthFeedback | null;
  legacyReady: boolean;
  onOpenLegacySignup: () => Promise<void>;
  onRouteAuthenticatedUser: (user: User) => Promise<void>;
  onViewChange: (view: AuthView) => void;
  view: AuthView;
};

function getStoredRoleIntent(): LoginRole {
  const stored = window.localStorage.getItem('loginRoleIntent');
  return stored === 'trainer' ? 'trainer' : 'student';
}

function setStoredRoleIntent(role: LoginRole) {
  window.localStorage.setItem('loginRoleIntent', role);
  window.setLoginRoleIntent?.(role, { silent: true });
}

function isEmailConfirmed(user: { email_confirmed_at?: string | null }) {
  return Boolean(user.email_confirmed_at);
}

function getPendingVerificationEmail() {
  return window.localStorage.getItem('pendingVerificationEmail') || '';
}

function setPendingVerificationEmail(email: string) {
  window.localStorage.setItem('pendingVerificationEmail', email);
}

function useThemeDocumentSync() {
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const themeColor = themeMeta[theme].metaColor;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
  }, [theme]);
}

export function AuthExperience({
  externalFeedback,
  legacyReady,
  onOpenLegacySignup,
  onRouteAuthenticatedUser,
  onViewChange,
  view
}: AuthExperienceProps) {
  useThemeDocumentSync();

  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [password, setPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(() => isRecoveryHashActive());
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [role, setRole] = useState<LoginRole>(() => getStoredRoleIntent());
  const [showPassword, setShowPassword] = useState(false);

  const submitLabel = useMemo(() => (role === 'trainer' ? 'Entrar como Treinador' : 'Entrar como Aluno'), [role]);

  useEffect(() => {
    setStoredRoleIntent(role);
  }, [role]);

  useEffect(() => {
    if (externalFeedback?.message) {
      setFeedback(externalFeedback);
      onViewChange('login');
    }
  }, [externalFeedback, onViewChange]);

  const showFeedback = (message: string, type: AuthFeedback['type'] = 'error') => {
    setFeedback(message ? { message, type } : null);
  };

  const getClient = () => {
    const client = getSupabaseClient();
    if (!client) {
      showFeedback(getSupabaseUnavailableMessage('login'), 'error');
      return null;
    }

    return client;
  };

  const handleSignup = async () => {
    setLoading('signup');
    showFeedback('', 'info');

    try {
      await onOpenLegacySignup();
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'Nao foi possivel abrir o cadastro.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    showFeedback('', 'info');

    const safeEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(safeEmail)) {
      showFeedback('Informe um e-mail valido.', 'error');
      return;
    }

    if (!password) {
      showFeedback('Informe sua senha.', 'error');
      return;
    }

    const client = getClient();
    if (!client) return;

    setLoading('login');
    setStoredRoleIntent(role);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: safeEmail,
        password
      });

      if (error || !data.user) {
        showFeedback(getAuthErrorMessage(error, 'login') || 'E-mail ou senha incorretos.', 'error');
        return;
      }

      if (!isEmailConfirmed(data.user)) {
        await client.auth.signOut();
        setPendingVerificationEmail(safeEmail);
        showFeedback('Seu e-mail ainda nao foi verificado. Use "Reenviar verificacao de e-mail".', 'warning');
        return;
      }

      showFeedback('Login confirmado. Abrindo seu painel...', 'success');
      await onRouteAuthenticatedUser(data.user);
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'Nao foi possivel entrar agora.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordReset = async () => {
    showFeedback('', 'info');

    const safeEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(safeEmail)) {
      showFeedback('Digite seu e-mail para recuperar a senha.', 'error');
      return;
    }

    const client = getClient();
    if (!client) return;

    setLoading('reset');

    try {
      const { error } = await client.auth.resetPasswordForEmail(safeEmail, {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      });

      if (error) {
        showFeedback(getAuthErrorMessage(error, 'resend') || 'Nao foi possivel enviar o e-mail.', 'error');
        return;
      }

      showFeedback('Enviamos o link de recuperacao. Confira sua caixa de entrada e spam.', 'success');
    } finally {
      setLoading(null);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    showFeedback('', 'info');

    if (recoveryPassword.length < 8 || !/[A-Za-z]/.test(recoveryPassword) || !/\d/.test(recoveryPassword)) {
      showFeedback('A nova senha deve ter ao menos 8 caracteres, com letras e numeros.', 'error');
      return;
    }

    if (recoveryPassword !== recoveryConfirmPassword) {
      showFeedback('A confirmacao da nova senha nao confere.', 'error');
      return;
    }

    const client = getClient();
    if (!client) return;

    setLoading('recovery');

    try {
      const { error } = await client.auth.updateUser({ password: recoveryPassword });

      if (error) {
        showFeedback(getAuthErrorMessage(error), 'error');
        return;
      }

      await client.auth.signOut();
      setRecoveryMode(false);
      setRecoveryPassword('');
      setRecoveryConfirmPassword('');
      if (window.location.hash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
      showFeedback('Senha atualizada com sucesso. Entre novamente.', 'success');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    const client = getClient();
    if (!client) return;

    setLoading('google');
    setStoredRoleIntent(role);

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` }
      });

      if (error) {
        showFeedback(getAuthErrorMessage(error), 'error');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleResendVerification = async () => {
    const safeEmail = email.trim().toLowerCase() || getPendingVerificationEmail().trim().toLowerCase();

    if (!EMAIL_PATTERN.test(safeEmail)) {
      showFeedback('Digite seu e-mail para reenviar a verificacao.', 'error');
      return;
    }

    const client = getClient();
    if (!client) return;

    setLoading('resend');

    try {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: safeEmail,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });

      if (error) {
        showFeedback(getAuthErrorMessage(error, 'resend'), 'error');
        return;
      }

      setPendingVerificationEmail(safeEmail);
      showFeedback('Enviamos um novo e-mail de verificacao. Confira sua caixa de entrada e spam.', 'success');
    } finally {
      setLoading(null);
    }
  };

  if (view === 'home') {
    return (
      <main className="authx-viewport" data-auth-view="home">
        <div className="authx-bg-orb authx-bg-orb-a" />
        <div className="authx-bg-orb authx-bg-orb-b" />
        <div className="authx-bg-grid" />

        <div className="authx-topbar">
          <BrandMark />
          <ThemeToggle />
        </div>

        <section className="authx-home-shell" aria-labelledby="authx-home-title">
          <AuthCard className="authx-home-card">
            <BrandMark />
            <h1 id="authx-home-title">Aplicativo-Consultoria</h1>
            <p>Treino, dieta e acompanhamento em um painel direto para aluno e treinador.</p>

            <div className="authx-action-stack">
              <Button icon={<ArrowRightIcon />} onClick={() => onViewChange('login')} type="button">
                Entrar
              </Button>
              <Button
                icon={<ArrowRightIcon />}
                loading={loading === 'signup'}
                onClick={handleSignup}
                type="button"
                variant="secondary"
              >
                Criar conta
              </Button>
            </div>
          </AuthCard>
        </section>
      </main>
    );
  }

  return (
    <main className="authx-viewport" data-auth-view="login">
      <div className="authx-bg-orb authx-bg-orb-a" />
      <div className="authx-bg-orb authx-bg-orb-b" />
      <div className="authx-bg-grid" />

      <div className="authx-topbar">
        <button className="authx-back-button" onClick={() => onViewChange('home')} type="button">
          <ArrowLeftIcon />
          <span>Voltar</span>
        </button>
        <ThemeToggle />
      </div>

      <section className="authx-login-shell" aria-labelledby="authx-login-title">
        <AuthCard>
          <header className="authx-card-header">
            <BrandMark />
            <h1 id="authx-login-title">Acesse sua conta</h1>
            <p>Escolha o tipo de acesso e continue para seu painel.</p>
          </header>

          <RoleSelector onChange={setRole} value={role} />

          {feedback?.message ? (
            <p className="authx-feedback" data-type={feedback.type} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.message}
            </p>
          ) : null}

          {recoveryMode ? (
            <form className="authx-form" onSubmit={handleRecoverySubmit}>
              <AuthField
                action={
                  <button
                    aria-label="Mostrar nova senha"
                    className="authx-input-action"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    <EyeIcon />
                  </button>
                }
                autoComplete="new-password"
                icon={<LockIcon />}
                id="recovery-new-pass"
                label="Nova senha"
                onChange={(event) => setRecoveryPassword(event.target.value)}
                placeholder="Minimo 8 caracteres"
                type={showPassword ? 'text' : 'password'}
                value={recoveryPassword}
              />
              <AuthField
                autoComplete="new-password"
                icon={<LockIcon />}
                id="recovery-confirm-pass"
                label="Confirmar nova senha"
                onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                placeholder="Repita a nova senha"
                type={showPassword ? 'text' : 'password'}
                value={recoveryConfirmPassword}
              />
              <Button loading={loading === 'recovery'} type="submit">
                Salvar nova senha
              </Button>
            </form>
          ) : (
            <form className="authx-form" onSubmit={handleLogin}>
              <AuthField
                autoCapitalize="off"
                autoComplete="email"
                autoCorrect="off"
                icon={<MailIcon />}
                id="login-email"
                inputMode="email"
                label="E-mail"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                spellCheck={false}
                type="email"
                value={email}
              />
              <AuthField
                action={
                  <button
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="authx-input-action"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    <EyeIcon />
                  </button>
                }
                autoComplete="current-password"
                icon={<LockIcon />}
                id="login-pass"
                label="Senha"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />

              <button className="authx-text-action" onClick={handlePasswordReset} type="button">
                {loading === 'reset' ? 'Enviando...' : 'Esqueci minha senha'}
              </button>

              <Button loading={loading === 'login'} type="submit">
                {submitLabel}
              </Button>
            </form>
          )}

          {!recoveryMode ? (
            <>
              <div className="authx-divider">
                <span>ou</span>
              </div>

              <div className="authx-secondary-grid">
                <Button
                  icon={<GoogleIcon />}
                  loading={loading === 'google'}
                  onClick={handleGoogleLogin}
                  type="button"
                  variant="secondary"
                >
                  Entrar com Google
                </Button>
                <Button
                  icon={<MailIcon />}
                  loading={loading === 'resend'}
                  onClick={handleResendVerification}
                  type="button"
                  variant="secondary"
                >
                  Reenviar verificacao
                </Button>
              </div>

              <footer className="authx-card-footer">
                <span>Nao tem uma conta?</span>
                <button disabled={!legacyReady || loading === 'signup'} onClick={handleSignup} type="button">
                  Criar conta
                </button>
              </footer>
            </>
          ) : null}
        </AuthCard>
      </section>
    </main>
  );
}
