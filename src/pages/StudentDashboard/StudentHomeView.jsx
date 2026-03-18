import React from 'react';

function StudentHomeView() {
  return (
    <div className="student-home">
      <div className="welcome-card">
        <h2>Olá, Nicolas! 👋</h2>
        <p>Bora pra cima que hoje tem treino!</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <i className="ph-fill ph-fire" style={{ color: '#f97316' }}></i>
          <strong>0</strong>
          <span>Treinos este mês</span>
        </div>
        <div className="stat-card">
          <i className="ph-fill ph-lightning" style={{ color: '#eab308' }}></i>
          <strong>--</strong>
          <span>Meta diária</span>
        </div>
      </div>
    </div>
  );
}

export default StudentHomeView;
