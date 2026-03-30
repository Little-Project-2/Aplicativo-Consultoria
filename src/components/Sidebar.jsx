import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../state/session';
import { supabase } from '../lib/supabaseClient';

function Sidebar({ pendingCount, duvidasCount }) {
  const navigate = useNavigate();
  const session = getSession();

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

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon glow" style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="a">
                <stop offset="0%" stopColor="#A3E635" />
                <stop offset="100%" stopColor="#84CC16" />
              </linearGradient>
            </defs>
            <rect x="6" y="15" width="20" height="2" rx="1" fill="url(#a)" />
            <rect x="2" y="12" width="5" height="8" rx="1.5" fill="url(#a)" />
            <circle cx="4.5" cy="11" r="1" fill="url(#a)" />
            <circle cx="4.5" cy="21" r="1" fill="url(#a)" />
            <rect x="25" y="12" width="5" height="8" rx="1.5" fill="url(#a)" />
            <circle cx="27.5" cy="11" r="1" fill="url(#a)" />
            <circle cx="27.5" cy="21" r="1" fill="url(#a)" />
            <rect x="13" y="14" width="6" height="4" rx="1" fill="#121214" />
            <circle cx="16" cy="16" r="1.2" fill="url(#a)" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{session?.name || 'Treinador'}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>Trainer Admin</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/trainer" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-squares-four"></i> Dashboard
        </NavLink>
        <NavLink to="/trainer/alunos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-users"></i> Alunos
          {pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
        </NavLink>
        <NavLink to="/trainer/duvidas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-chat-circle-dots"></i> Dúvidas
          {duvidasCount > 0 && <span className="nav-badge">{duvidasCount}</span>}
        </NavLink>
        <NavLink to="/trainer/exercicios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-barbell"></i> Exercícios
        </NavLink>
        <NavLink to="/trainer/configuracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-gear"></i> Configurações
        </NavLink>
        <NavLink to="/status" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="ph-bold ph-plugs"></i> Status Supabase
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item btn-logout" onClick={handleLogout}>
          <i className="ph-bold ph-sign-out"></i> Sair
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
