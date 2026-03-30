import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getSession, setSession } from '../state/session';
import { supabase } from '../lib/supabaseClient';

function StudentDashboard() {
  const session = getSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearSession();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem('currentStudentId');
    navigate('/');
  };

  const handleBackToTrainer = () => {
    setSession({ role: 'trainer', name: session?.trainerName || 'Treinador' });
    navigate('/trainer');
  };

  return (
    <div id="student-dashboard-screen" className="active">
      <header className="dash-header">
        <div className="header-left">
          <h1>Portal do Aluno</h1>
          <span className="text-muted" style={{ marginLeft: '0.75rem' }}>{session?.name || 'Aluno'}</span>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: '0.5rem' }}>
          {session?.impersonating && (
            <button className="btn-secondary" onClick={handleBackToTrainer}>
              Voltar ao treinador
            </button>
          )}
          <button className="profile-trigger" onClick={handleLogout} title="Sair">
            <i className="ph-fill ph-sign-out"></i>
          </button>
        </div>
      </header>

      <main className="dash-content" style={{ paddingBottom: '80px' }}>
        <Outlet />
      </main>

      <nav className="student-tabs">
        <NavLink to="/student" end className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-house"></i>
          <span>Home</span>
        </NavLink>
        <NavLink to="/student/treino" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-barbell"></i>
          <span>Treino</span>
        </NavLink>
        <NavLink to="/student/dieta" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-fork-knife"></i>
          <span>Dieta</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default StudentDashboard;
