import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ensureProfile } from '../services/supabaseData';
import { getSession, setSession } from '../state/session';

const TRAINER_CODE = '12345';
const STUDENT_CODE = '77777';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [authMode, setAuthMode] = useState('email');
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      const session = getSession();
      if (session?.role === 'trainer') {
        navigate('/trainer');
        return;
      }
      if (session?.role === 'student') {
        navigate('/student');
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        const profile = await ensureProfile();
        if (!profile?.profile_complete) {
          navigate('/profile-setup');
          return;
        }
        setSession({ role: profile?.role || 'trainer', name: profile?.name || 'Treinador' });
        navigate(profile?.role === 'student' ? '/student' : '/trainer');
      }
    };

    bootstrap();
  }, [navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0]
            }
          }
        });
        if (signUpError) throw signUpError;

        if (data?.user && !data?.session) {
          setMessage('Conta criada! Verifique seu e-mail para confirmar o acesso.');
          return;
        }

        await ensureProfile();
        navigate('/profile-setup');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError) throw authError;

      const profile = await ensureProfile();
      if (!profile?.profile_complete) {
        navigate('/profile-setup');
        return;
      }
      setSession({ role: profile?.role || 'trainer', name: profile?.name || data?.user?.email || 'Treinador' });
      navigate(profile?.role === 'student' ? '/student' : '/trainer');
    } catch (err) {
      setError(err.message || 'Não foi possível continuar.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (code.length !== 5) {
      setError('Digite um código de 5 dígitos válido.');
      return;
    }

    if (code === TRAINER_CODE) {
      setSession({ role: 'trainer', name: 'Treinador' });
      navigate('/trainer');
      return;
    }

    if (code === STUDENT_CODE) {
      setSession({ role: 'student', name: 'Aluno' });
      navigate('/student');
      return;
    }

    setError('Código inválido. Verifique e tente novamente.');
  };

  return (
    <div id="global-login-screen" className="screen active">
      <div className="gl-login-bg">
        <div className="gl-glow gl-glow-1"></div>
        <div className="gl-glow gl-glow-2"></div>
      </div>

      <div className="gl-card-wrapper">
        <div className="gl-card">
          <div className="gl-header">
            <div className="gl-logo-icon">
              <i className="ph-bold ph-lightning"></i>
            </div>
            <h1 className="gl-title">Consultoria<span className="gl-title-accent">Fit</span></h1>
            <p className="gl-subtitle">Entre para acessar sua consultoria</p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${authMode === 'email' ? 'active' : ''}`}
              onClick={() => setAuthMode('email')}
            >
              Conta
            </button>
            <button
              type="button"
              className={`auth-tab ${authMode === 'code' ? 'active' : ''}`}
              onClick={() => setAuthMode('code')}
            >
              Código
            </button>
          </div>

          {error && (
            <div className="gl-error-banner">
              <i className="ph-bold ph-warning-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="gl-success-banner">
              <i className="ph-bold ph-check-circle"></i>
              <span>{message}</span>
            </div>
          )}

          {authMode === 'email' ? (
            <form className="gl-form" onSubmit={handleEmailSubmit}>
              <div className="gl-input-group">
                <label className="gl-label">E-MAIL</label>
                <div className="gl-input-wrapper">
                  <i className="ph-bold ph-envelope gl-input-icon"></i>
                  <input
                    type="email"
                    className="gl-input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="gl-input-group">
                <label className="gl-label">SENHA</label>
                <div className="gl-input-wrapper">
                  <i className="ph-bold ph-lock gl-input-icon"></i>
                  <input
                    type="password"
                    className="gl-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="gl-btn-submit" disabled={loading}>
                {!loading ? <span>{isSignup ? 'Criar conta' : 'Entrar'}</span> : <span className="gl-spinner"></span>}
              </button>

              <button
                className="gl-btn-code"
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                  setMessage('');
                }}
              >
                <i className={`ph-bold ${isSignup ? 'ph-sign-in' : 'ph-user-plus'}`}></i>
                {isSignup ? 'Já tenho conta' : 'Criar conta'}
              </button>
            </form>
          ) : (
            <form className="gl-form" onSubmit={handleCodeSubmit}>
              <div className="gl-input-group">
                <label className="gl-label">CÓDIGO DE ACESSO (5 DÍGITOS)</label>
                <div className="gl-input-wrapper">
                  <i className="ph-bold ph-hash gl-input-icon"></i>
                  <input
                    type="tel"
                    className="gl-input gl-input-code"
                    placeholder="00000"
                    maxLength="5"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 5))}
                  />
                </div>
              </div>

              <button type="submit" className="gl-btn-submit">
                Validar código
              </button>

              <div className="code-hint">
                <span>Treinador: 12345</span>
                <span>Aluno: 77777</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
