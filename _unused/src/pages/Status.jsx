import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function Status() {
  const [status, setStatus] = useState({
    auth: 'Verificando...',
    db: 'Verificando...',
    error: ''
  });

  useEffect(() => {
    const run = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const authOk = !!sessionData?.session;

        const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
        if (dbError) throw dbError;

        setStatus({
          auth: authOk ? 'Conectado (sessão ativa)' : 'Conectado (sem sessão)',
          db: 'Conectado',
          error: ''
        });
      } catch (err) {
        setStatus({
          auth: 'Falha',
          db: 'Falha',
          error: err.message || 'Erro ao conectar com Supabase.'
        });
      }
    };

    run();
  }, []);

  return (
    <div className="settings-grid" style={{ paddingTop: '1rem' }}>
      <section className="settings-card">
        <div className="settings-card-header">
          <h2>Status do Supabase</h2>
          <p className="subtitle">Verificação rápida da conexão e autenticação.</p>
        </div>

        <div className="status-line">
          <strong>Auth:</strong>
          <span className={status.auth.includes('Falha') ? 'text-warning' : 'text-success'}>{status.auth}</span>
        </div>
        <div className="status-line">
          <strong>Banco:</strong>
          <span className={status.db.includes('Falha') ? 'text-warning' : 'text-success'}>{status.db}</span>
        </div>

        {status.error && (
          <div className="gl-error-banner" style={{ marginTop: '1rem' }}>
            <i className="ph-bold ph-warning-circle"></i>
            <span>{status.error}</span>
          </div>
        )}
      </section>
    </div>
  );
}

export default Status;
