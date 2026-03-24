import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showCodeSection, setShowCodeSection] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = (e) => {
    e.preventDefault();
    setError('O login por e-mail está temporariamente desabilitado. Use o Código de 5 Dígitos.');
  };

  const handleGoogleLogin = () => {
    setError('O login com Google está temporariamente desabilitado.');
  };

  const handleUnifiedLogin = (e) => {
    e.preventDefault();
    if (pin.length !== 5) {
      setError('Digite um código de 5 dígitos válido.');
      return;
    }

    setLoading(true);
    // Simulação de login por PIN (conforme lógica original do localStorage)
    setTimeout(() => {
      if (pin === '12345') { // Código de exemplo do Nicolas
        navigate('/trainer');
      } else if (pin === '77777') { // Código de exemplo do Diego
        navigate('/student');
      } else {
        setError('Código inválido. Verifique e tente novamente.');
      }
      setLoading(false);
    }, 800);
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
            <p className="gl-subtitle">Acesse sua conta para continuar</p>
          </div>

          {error && (
            <div className="gl-error-banner">
              <i className="ph-bold ph-warning-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <form className="gl-form" onSubmit={handleEmailLogin}>
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
              {!loading ? <span>Entrar</span> : <span className="gl-spinner"></span>}
            </button>
          </form>

          <div className="gl-divider"><span>OU</span></div>

          <button className="gl-btn-google" onClick={handleGoogleLogin}>
            <i className="ph-bold ph-google-logo"></i>
            Entrar com Google
          </button>

          <button className="gl-btn-code" onClick={() => setShowCodeSection(!showCodeSection)}>
            <i className="ph-bold ph-hash"></i>
            Entrar com Código de 5 Dígitos
          </button>

          {showCodeSection && (
            <div id="gl-code-section">
              <form className="gl-form" onSubmit={handleUnifiedLogin} style={{ marginTop: '0.5rem' }}>
                <div className="gl-input-group" style={{ marginBottom: '0.75rem' }}>
                  <div className="gl-input-wrapper">
                    <i className="ph-bold ph-hash gl-input-icon"></i>
                    <input
                      type="tel"
                      className="gl-input gl-input-code"
                      placeholder="00000"
                      maxLength="5"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').substring(0, 5))}
                    />
                  </div>
                </div>
                <button type="submit" className="gl-btn-submit" style={{ marginTop: 0 }} disabled={loading}>
                  {loading ? 'Verificando…' : 'Validar Código'}
                </button>
              </form>
            </div>
          )}

          <p className="gl-footer-text">
            Não tem uma conta? <a href="#" className="gl-footer-link">Criar Perfil</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
