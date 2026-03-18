import React, { useState, useEffect } from 'react';
import StatsOverview from '../components/StatsOverview';
import EngagementChart from '../components/EngagementChart';
import StudentList from '../components/StudentList';

function TrainerStatsView() {
  // Mock data for initial migration
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
  const [engagement, setEngagement] = useState({ total: 12, counts: [2, 1, 3, 0, 2, 4, 0] });
  const [recentStudents, setRecentStudents] = useState([
    { id: '001', name: 'João Silva', goal: 'Hipertrofia', weight: 82, kcal: 2800, status: 'active', statusText: 'Ativo' },
    { id: '002', name: 'Maria Souza', goal: 'Emagrecimento', weight: 68, kcal: 1800, status: 'active', statusText: 'Ativo' },
  ]);

  return (
    <div id="view-dashboard">
      <StatsOverview total={stats.total} active={stats.active} pending={stats.pending} />

      <div className="dashboard-insights">
        <EngagementChart total={engagement.total} counts={engagement.counts} />
        
        <div className="quick-filters">
          <button className="filter-chip active">Todos <span className="filter-count">0</span></button>
          <button className="filter-chip">Sem treino <span className="filter-count">0</span></button>
          <button className="filter-chip">Avaliações <span className="filter-count">0</span></button>
          <button className="filter-chip">Dúvidas <span className="filter-count">0</span></button>
        </div>
      </div>

      <StudentList students={recentStudents} />
    </div>
  );
}

export default TrainerStatsView;
