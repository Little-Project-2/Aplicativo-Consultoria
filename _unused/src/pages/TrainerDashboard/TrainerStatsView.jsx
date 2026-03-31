import React from 'react';
import StatsOverview from '../../components/StatsOverview';
import EngagementChart from '../../components/EngagementChart';
import StudentList from '../../components/StudentList';
import { demoStudents } from '../../data/demoData';
import { fetchRecentWorkoutHistory, fetchStudents, fetchProfile, getCurrentUser } from '../../services/supabaseData';
import { setSession } from '../../state/session';
import { useNavigate } from 'react-router-dom';
import useLocalStorage from '../../hooks/useLocalStorage';

function TrainerStatsView() {
  const [students, setStudents] = React.useState([]);
  const [recentHistory, setRecentHistory] = React.useState([]);
  const [trainerCode, setTrainerCode] = React.useState('');
  const [, setCurrentStudentId] = useLocalStorage('currentStudentId', '');
  const navigate = useNavigate();

  React.useEffect(() => {
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await fetchProfile(user.id);
          setTrainerCode(profile?.trainer_code || '');
        }
        const data = await fetchStudents();
        setStudents(data.length ? data : demoStudents);
        const history = await fetchRecentWorkoutHistory(6);
        setRecentHistory(history);
      } catch {
        setStudents(demoStudents);
      }
    };

    load();
  }, []);

  const handleTestStudent = () => {
    const first = students[0];
    if (first?.id) {
      setCurrentStudentId(first.id);
    }
    setSession({ role: 'student', name: first?.name || 'Aluno', trainerName: 'Treinador', impersonating: true });
    navigate('/student');
  };

  const total = students.length;
  const active = students.filter((s) => (s.status || 'active') === 'active').length;
  const pending = students.filter((s) => s.status === 'pending').length;

  const engagement = {
    total: 12,
    counts: [2, 1, 3, 0, 2, 4, 0]
  };

  return (
    <div id="view-dashboard">
      <div className="trainer-hero">
        <div>
          <h2>Resumo da consultoria</h2>
          <p className="subtitle">Acompanhe alunos ativos e treinos concluídos.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={handleTestStudent}>
            Testar aluno
          </button>
          <div className="trainer-code-chip">
            <span>Código do treinador</span>
            <strong>{trainerCode || '—'}</strong>
          </div>
        </div>
      </div>

      <StatsOverview total={total} active={active} pending={pending} />

      <div className="dashboard-insights">
        <EngagementChart total={engagement.total} counts={engagement.counts} />

        <div className="quick-filters">
          <button className="filter-chip active">Todos <span className="filter-count">{total}</span></button>
          <button className="filter-chip">Sem treino <span className="filter-count">0</span></button>
          <button className="filter-chip">Avaliações <span className="filter-count">0</span></button>
          <button className="filter-chip">Dúvidas <span className="filter-count">0</span></button>
        </div>
      </div>

      <div className="history-panel">
        <div className="section-header">
          <h2>Treinos recentes</h2>
        </div>
        {recentHistory.length === 0 ? (
          <div className="empty-state">Nenhum treino concluído ainda</div>
        ) : (
          <div className="history-list">
            {recentHistory.map((item) => (
              <div key={item.id} className="history-row">
                <div>
                  <strong>{item.title || 'Treino'}</strong>
                  <span>{new Date(item.completed_at).toLocaleString('pt-BR')}</span>
                </div>
                <span className="history-chip">Concluído</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <StudentList students={students.slice(0, 6)} />
    </div>
  );
}

export default TrainerStatsView;
