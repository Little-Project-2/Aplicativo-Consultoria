import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { demoWorkouts } from '../../data/demoData';
import { fetchStudents, fetchWorkoutPlan, addWorkoutHistory, fetchWorkoutHistory } from '../../services/supabaseData';

function safeNumber(value) {
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

function StudentWorkoutView() {
  const [selectedId, setSelectedId] = useLocalStorage('currentStudentId', '');
  const [workouts, setWorkouts] = useState([]);
  const [status, setStatus] = useState('');
  const [completedTitles, setCompletedTitles] = useState([]);
  const [activeIdx, setActiveIdx] = useState(null);
  const [sessionData, setSessionData] = useState({});
  const [exerciseNotes, setExerciseNotes] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        if (!selectedId) {
          const students = await fetchStudents();
          if (students.length > 0) {
            setSelectedId(students[0].id);
          }
        }
        if (!selectedId) return;
        const plan = await fetchWorkoutPlan(selectedId);
        setWorkouts(plan?.blocks || demoWorkouts);
        const history = await fetchWorkoutHistory(selectedId);
        setCompletedTitles(history.map((h) => h.title));
      } catch {
        setWorkouts(demoWorkouts);
      }
    };

    load();
  }, [selectedId, setSelectedId]);

  const activeWorkout = useMemo(() => {
    if (activeIdx === null) return null;
    return workouts[activeIdx] || null;
  }, [activeIdx, workouts]);

  useEffect(() => {
    if (!activeWorkout) return;
    const initialData = {};
    activeWorkout.exercises.forEach((ex, exIdx) => {
      const setCount = Number(ex.series) || 0;
      initialData[exIdx] = Array.from({ length: setCount }).map(() => ({
        kg: ex.load || '',
        reps: ex.reps || '',
        rpe: '',
        exec: '',
        done: false
      }));
    });
    setSessionData(initialData);
    setExerciseNotes({});
  }, [activeWorkout]);

  const toggleSet = (exIdx, setIdx) => {
    setSessionData((prev) => {
      const copy = { ...prev };
      const sets = [...(copy[exIdx] || [])];
      const current = sets[setIdx] || {};
      sets[setIdx] = { ...current, done: !current.done };
      copy[exIdx] = sets;
      return copy;
    });
  };

  const updateSetField = (exIdx, setIdx, field, value) => {
    setSessionData((prev) => {
      const copy = { ...prev };
      const sets = [...(copy[exIdx] || [])];
      const current = sets[setIdx] || {};
      sets[setIdx] = { ...current, [field]: value };
      copy[exIdx] = sets;
      return copy;
    });
  };

  const resetSession = () => {
    setSessionData({});
    setExerciseNotes({});
    setActiveIdx(null);
  };

  const sessionStats = useMemo(() => {
    if (!activeWorkout) return null;
    let volume = 0;
    let maxReps = 0;
    let maxWeight = 0;
    let prCount = 0;
    Object.values(sessionData).forEach((sets) => {
      sets.forEach((set) => {
        const kg = safeNumber(set.kg);
        const reps = safeNumber(set.reps);
        volume += kg * reps;
        if (reps > maxReps) maxReps = reps;
        if (kg > maxWeight) maxWeight = kg;
        if (set.done) prCount += 1;
      });
    });
    return { volume, maxReps, maxWeight, prCount };
  }, [sessionData, activeWorkout]);

  const handleFinish = async () => {
    if (!activeWorkout || !selectedId) return;
    const totalSets = activeWorkout.exercises.reduce((acc, ex) => acc + Number(ex.series || 0), 0);
    const doneSets = Object.values(sessionData)
      .flat()
      .filter((set) => set.done).length;

    const details = {
      title: activeWorkout.title,
      exercises: activeWorkout.exercises.map((ex, exIdx) => ({
        name: ex.name,
        note: exerciseNotes[exIdx] || '',
        sets: (sessionData[exIdx] || []).map((set, idx) => ({
          index: idx + 1,
          kg: set.kg,
          reps: set.reps,
          rpe: set.rpe,
          exec: set.exec,
          done: set.done
        }))
      })),
      summary: {
        totalSets,
        doneSets,
        volume: sessionStats?.volume || 0
      }
    };

    try {
      await addWorkoutHistory({
        student_id: selectedId,
        title: activeWorkout.title,
        notes: JSON.stringify(details),
        completed_at: new Date().toISOString()
      });
      setCompletedTitles((prev) => Array.from(new Set([...prev, activeWorkout.title])));
      setStatus('Treino concluído registrado no Supabase.');
      resetSession();
    } catch {
      setStatus('Falha ao registrar treino no Supabase.');
    }
  };

  return (
    <div id="student-workout-screen" className="workout-page">
      <div className="section-header workout-hero">
        <div>
          <h2>Treinos</h2>
          <p className="subtitle">Estilo Hevy: registre séries, carga e finalize.</p>
        </div>
        {activeWorkout && (
          <button className="btn-secondary" onClick={resetSession}>
            Trocar treino
          </button>
        )}
      </div>

      {status && <p className="text-muted" style={{ marginBottom: '0.75rem' }}>{status}</p>}

      {!activeWorkout ? (
        <div className="workout-plan-grid">
          {workouts.map((block, i) => (
            <button
              key={i}
              className={`workout-plan-card ${completedTitles.includes(block.title) ? 'done' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <div>
                <h3>{block.title}</h3>
                <span>{block.exercises.length} exercícios</span>
              </div>
              <span className="plan-chip">Abrir</span>
              {completedTitles.includes(block.title) && <span className="plan-done">Concluído</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="workout-session">
          <div className="session-header">
            <div>
              <h3>{activeWorkout.title}</h3>
              <span>{activeWorkout.exercises.length} exercícios</span>
            </div>
            <button className="btn-primary" onClick={handleFinish}>
              Finalizar treino
            </button>
          </div>

          <div className="records-panel">
            <div className="records-header">
              <h4>Recordes desta sessão</h4>
              <span className="records-pill">{sessionStats?.prCount || 0} PRs</span>
            </div>
            <div className="records-grid">
              <div className="records-card">
                <span>Volume</span>
                <strong>{Math.round(sessionStats?.volume || 0)} kg</strong>
              </div>
              <div className="records-card">
                <span>Reps recorde</span>
                <strong>{sessionStats?.maxReps || 0} reps</strong>
              </div>
              <div className="records-card">
                <span>Peso recorde</span>
                <strong>{sessionStats?.maxWeight || 0} kg</strong>
              </div>
            </div>
          </div>

          <div className="exercise-list">
            {activeWorkout.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="exercise-card hevy-card">
                <div className="exercise-header">
                  <div>
                    <h4>{ex.name}</h4>
                    <span>{ex.series} séries • {ex.reps} reps • {ex.load} kg</span>
                  </div>
                  <span className="exercise-rest">Descanso: {ex.rest}</span>
                </div>

                <textarea
                  className="hevy-notes"
                  rows="2"
                  placeholder="Notas do exercício..."
                  value={exerciseNotes[exIdx] || ''}
                  onChange={(e) => setExerciseNotes({ ...exerciseNotes, [exIdx]: e.target.value })}
                />

                <div className="hevy-table">
                  <div className="hevy-row hevy-head">
                    <span>Série</span>
                    <span>Kg</span>
                    <span>Reps</span>
                    <span>PSE</span>
                    <span>Exec</span>
                    <span>Ação</span>
                  </div>
                  {(sessionData[exIdx] || []).map((set, setIdx) => (
                    <div key={`${exIdx}-${setIdx}`} className={`hevy-row ${set.done ? 'done' : ''}`}>
                      <span className="hevy-pill">{setIdx + 1}</span>
                      <input
                        className="hevy-input"
                        value={set.kg}
                        onChange={(e) => updateSetField(exIdx, setIdx, 'kg', e.target.value)}
                      />
                      <input
                        className="hevy-input"
                        value={set.reps}
                        onChange={(e) => updateSetField(exIdx, setIdx, 'reps', e.target.value)}
                      />
                      <input
                        className="hevy-input hevy-small"
                        value={set.rpe}
                        onChange={(e) => updateSetField(exIdx, setIdx, 'rpe', e.target.value)}
                      />
                      <input
                        className="hevy-input hevy-small"
                        value={set.exec}
                        onChange={(e) => updateSetField(exIdx, setIdx, 'exec', e.target.value)}
                      />
                      <button
                        className="hevy-check"
                        type="button"
                        onClick={() => toggleSet(exIdx, setIdx)}
                      >
                        {set.done ? '✓' : '○'}
                      </button>
                    </div>
                  ))}
                </div>

                {ex.note && <p className="exercise-note">{ex.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentWorkoutView;
