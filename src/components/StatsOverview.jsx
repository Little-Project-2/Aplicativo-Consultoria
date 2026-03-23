import React from 'react';

function StatsOverview({ total, active, pending }) {
  return (
    <div className="trainer-stats-row status-bar">
      <div className="t-stat-card status-total">
        <h3>{total}</h3>
        <p>Total</p>
      </div>
      <div className="t-stat-card status-active">
        <h3 className="text-success">{active}</h3>
        <p>Ativos</p>
      </div>
      <div className="t-stat-card status-pending">
        <h3 className="text-warning">{pending}</h3>
        <p>Pendentes</p>
      </div>
    </div>
  );
}

export default StatsOverview;
