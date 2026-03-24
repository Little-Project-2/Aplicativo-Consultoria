import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function TrainerDashboard() {
  return (
    <div className="dashboard-layout">
      <Sidebar pendingCount={0} duvidasCount={0} />
      
      <main className="main-content">
        <header className="top-header">
          <h1 className="page-title">Painel de Controle</h1>
          <div className="header-profile">
            <button className="profile-avatar">
              <i className="ph-fill ph-user"></i>
            </button>
          </div>
        </header>

        {/* Aqui serão renderizadas as sub-páginas (Stats, Alunos, etc.) */}
        <Outlet />
      </main>
    </div>
  );
}

export default TrainerDashboard;
