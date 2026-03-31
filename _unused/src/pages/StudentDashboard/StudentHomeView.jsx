import React from 'react';
import { getSession } from '../../state/session';
import { fetchWorkoutHistory } from '../../services/supabaseData';
import useLocalStorage from '../../hooks/useLocalStorage';

function parseHistoryNotes(notes) {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
}

function StudentHomeView() {
  const session = getSession();
  const [selectedId] = useLocalStorage('currentStudentId', '');
  const [history, setHistory] = React.useState([]);
  const [activeHistory, setActiveHistory] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      if (!selectedId) return;
      try {
        const data = await fetchWorkoutHistory(selectedId);
        setHistory(data);
      } catch {
        setHistory([]);
      }
    };

    load();
  }, [selectedId]);

  const openHistory = (item) => {
    const details = parseHistoryNotes(item.notes);
    setActiveHistory({ ...item, details });
  };

  return (
    <div className="student-home">
      <div className="welcome-card">
        <h2>Olá, {session?.name || 'Aluno'}!</h2>
        <p>Bora pra cima que hoje tem treino!</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <i className="ph-fill ph-fire" style={{ color: '#f97316' }}></i>
          <strong>{history.length}</strong>
          <span>Treinos concluídos</span>
        </div>
        <div className="stat-card">
          <i className="ph-fill ph-lightning" style={{ color: '#eab308' }}></i>
          <strong>--</strong>
          <span>Meta diária</span>
        </div>
      </div>

      <div className="history-panel" style={{ marginTop: '1.5rem' }}>
        <div className="section-header">
          <h2>Últimos treinos</h2>
        </div>
        {history.length === 0 ? (
          <div className="empty-state">Nenhum treino concluído ainda</div>
        ) : (
          <div className="history-list">
            {history.slice(0, 6).map((item) => (
              <button key={item.id} className="history-row" onClick={() => openHistory(item)}>
                <div>
                  <strong>{item.title || 'Treino'}</strong>
                  <span>{formatDate(item.completed_at)}</span>
                </div>
                <span className="history-chip">Ver detalhes</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeHistory && (
        <div className="history-modal-overlay" onClick={() => setActiveHistory(null)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-head">
              <div>
                <h3>{activeHistory.title || 'Treino'}</h3>
                <span>{formatDate(activeHistory.completed_at)}</span>
              </div>
              <button className="btn-icon-minimal" onClick={() => setActiveHistory(null)}>
                <i className="ph-bold ph-x"></i>
              </button>
            </div>

            {activeHistory.details?.exercises ? (
              <div className="history-exercise-list">
                {activeHistory.details.exercises.map((ex, idx) => (
                  <div key={idx} className="history-exercise-card">
                    <div className="history-ex-header">
                      <h4>{ex.name}</h4>
                      <div className="history-tags">
                        <span className="history-tag">Volume {Math.round(ex.sets.reduce((acc, s) => acc + safeNumber(s.kg) * safeNumber(s.reps), 0))}kg</span>
                        <span className="history-tag">{ex.sets.filter((s) => s.done).length} séries</span>
                      </div>
                    </div>
                    {ex.note && <p className="history-note">{ex.note}</p>}
                    <div className="history-sets">
                      {ex.sets.map((set) => (
                        <div key={set.index} className={`history-set ${set.done ? 'done' : ''}`}>
                          <span className="history-chip-mini">{set.index}</span>
                          <span>{set.kg} kg</span>
                          <span>{set.reps} reps</span>
                          <span>PSE {set.rpe || '--'}</span>
                          <span>Exec {set.exec || '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Sem detalhes salvos para este treino.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function safeNumber(value) {
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

export default StudentHomeView;
