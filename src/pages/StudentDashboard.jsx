import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

function StudentDashboard() {
  return (
    <div id="student-dashboard-screen" className="active">
      <header className="dash-header">
        <div className="header-left">
          <h1>Portal do Aluno</h1>
        </div>
        <div className="header-right">
          <button className="profile-trigger">
            <i className="ph-fill ph-user"></i>
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
