import React, { useEffect, useMemo, useState } from 'react';
import StudentList from '../../components/StudentList';
import useLocalStorage from '../../hooks/useLocalStorage';
import { demoStudents, demoWorkouts, demoMeals } from '../../data/demoData';
import {
  createStudent,
  fetchStudents,
  saveWorkoutPlan,
  saveDietPlan,
  fetchWorkoutPlan,
  fetchDietPlan
} from '../../services/supabaseData';

function TrainerStudentsView() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', goal: '', weight: '', kcal: '' });
  const [selectedId, setSelectedId] = useLocalStorage('currentStudentId', '');
  const [statusMessage, setStatusMessage] = useState('');
  const [workoutBlocks, setWorkoutBlocks] = useState([]);
  const [dietMeals, setDietMeals] = useState([]);
  const [planStatus, setPlanStatus] = useState('');
  const [dietStatus, setDietStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStudents();
        if (!data || data.length === 0) {
          setStudents(demoStudents);
        } else {
          setStudents(data);
          if (!selectedId) setSelectedId(data[0].id);
        }
      } catch {
        setStudents(demoStudents);
      }
    };

    load();
  }, [selectedId, setSelectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const loadPlans = async () => {
      try {
        const [workout, diet] = await Promise.all([
          fetchWorkoutPlan(selectedId),
          fetchDietPlan(selectedId)
        ]);
        setWorkoutBlocks(workout?.blocks?.length ? workout.blocks : demoWorkouts);
        setDietMeals(diet?.meals?.length ? diet.meals : demoMeals);
        setPlanStatus('');
        setDietStatus('');
      } catch {
        setWorkoutBlocks(demoWorkouts);
        setDietMeals(demoMeals);
      }
    };
    loadPlans();
  }, [selectedId]);

  const filtered = students.filter((student) => {
    const text = `${student.name} ${student.goal} ${student.id}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      goal: form.goal.trim() || 'Hipertrofia',
      weight: Number(form.weight) || null,
      kcal: Number(form.kcal) || null,
      status: 'active',
      status_text: 'Ativo'
    };

    try {
      const created = await createStudent(payload);
      const next = [created, ...students];
      setStudents(next);
      setSelectedId(created.id);
      setStatusMessage('Aluno salvo no Supabase.');
    } catch (err) {
      const fallback = {
        id: String(Date.now()).slice(-6),
        ...payload,
        statusText: 'Ativo'
      };
      setStudents([fallback, ...students]);
      setSelectedId(fallback.id);
      setStatusMessage('Falha no Supabase. Salvo localmente.');
    }

    setForm({ name: '', goal: '', weight: '', kcal: '' });
  };

  const handleSeedWorkouts = async () => {
    if (!selectedId) return;
    try {
      await saveWorkoutPlan(selectedId, demoWorkouts);
      setWorkoutBlocks(demoWorkouts);
      setStatusMessage('Treino de exemplo salvo no Supabase.');
    } catch {
      setStatusMessage('Falha ao salvar treino no Supabase.');
    }
  };

  const handleSeedDiet = async () => {
    if (!selectedId) return;
    try {
      await saveDietPlan(selectedId, demoMeals);
      setDietMeals(demoMeals);
      setStatusMessage('Dieta de exemplo salva no Supabase.');
    } catch {
      setStatusMessage('Falha ao salvar dieta no Supabase.');
    }
  };

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedId),
    [students, selectedId]
  );
  const handleSaveWorkoutPlan = async () => {
    if (!selectedId) return;
    try {
      await saveWorkoutPlan(selectedId, workoutBlocks);
      setPlanStatus('Treino atualizado no Supabase.');
    } catch {
      setPlanStatus('Erro ao salvar treino no Supabase.');
    }
  };

  const handleSaveDietPlan = async () => {
    if (!selectedId) return;
    try {
      await saveDietPlan(selectedId, dietMeals);
      setDietStatus('Dieta atualizada no Supabase.');
    } catch {
      setDietStatus('Erro ao salvar dieta no Supabase.');
    }
  };

  const updateBlock = (index, patch) => {
    setWorkoutBlocks((prev) =>
      prev.map((block, idx) => (idx === index ? { ...block, ...patch } : block))
    );
  };

  const updateExercise = (blockIndex, exerciseIndex, patch) => {
    setWorkoutBlocks((prev) =>
      prev.map((block, idx) => {
        if (idx !== blockIndex) return block;
        const exercises = (block.exercises || []).map((ex, exIdx) =>
          exIdx === exerciseIndex ? { ...ex, ...patch } : ex
        );
        return { ...block, exercises };
      })
    );
  };

  const addExercise = (blockIndex) => {
    setWorkoutBlocks((prev) =>
      prev.map((block, idx) => {
        if (idx !== blockIndex) return block;
        const exercises = [
          ...(block.exercises || []),
          { name: 'Novo exercício', series: '3', reps: '10', load: '0', rest: '60s', note: '' }
        ];
        return { ...block, exercises };
      })
    );
  };

  const removeExercise = (blockIndex, exerciseIndex) => {
    setWorkoutBlocks((prev) =>
      prev.map((block, idx) => {
        if (idx !== blockIndex) return block;
        const exercises = (block.exercises || []).filter((_, exIdx) => exIdx !== exerciseIndex);
        return { ...block, exercises };
      })
    );
  };

  const addBlock = () => {
    setWorkoutBlocks((prev) => [
      ...prev,
      {
        title: `Novo Treino ${prev.length + 1}`,
        exercises: [{ name: 'Novo exercício', series: '3', reps: '10', load: '0', rest: '60s', note: '' }]
      }
    ]);
  };

  const removeBlock = (index) => {
    setWorkoutBlocks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateMeal = (mealIndex, patch) => {
    setDietMeals((prev) =>
      prev.map((meal, idx) => (idx === mealIndex ? { ...meal, ...patch } : meal))
    );
  };

  const updateMealItem = (mealIndex, itemIndex, patch) => {
    setDietMeals((prev) =>
      prev.map((meal, idx) => {
        if (idx !== mealIndex) return meal;
        const items = (meal.items || []).map((item, itIdx) =>
          itIdx === itemIndex ? { ...item, ...patch } : item
        );
        return { ...meal, items };
      })
    );
  };

  const addMeal = () => {
    setDietMeals((prev) => [
      ...prev,
      {
        name: `Nova Refeição ${prev.length + 1}`,
        items: [{ name: 'Alimento', qty: '100g', kcal: 200, prot: 10, carb: 20, fat: 5 }]
      }
    ]);
  };

  const removeMeal = (mealIndex) => {
    setDietMeals((prev) => prev.filter((_, idx) => idx !== mealIndex));
  };

  const addMealItem = (mealIndex) => {
    setDietMeals((prev) =>
      prev.map((meal, idx) => {
        if (idx !== mealIndex) return meal;
        const items = [
          ...(meal.items || []),
          { name: 'Alimento', qty: '100g', kcal: 200, prot: 10, carb: 20, fat: 5 }
        ];
        return { ...meal, items };
      })
    );
  };

  const removeMealItem = (mealIndex, itemIndex) => {
    setDietMeals((prev) =>
      prev.map((meal, idx) => {
        if (idx !== mealIndex) return meal;
        const items = (meal.items || []).filter((_, itIdx) => itIdx !== itemIndex);
        return { ...meal, items };
      })
    );
  };

  return (
    <div id="view-alunos">
      <div className="students-section">
        <div className="section-header">
          <h2>Alunos Ativos</h2>
        <div className="section-actions">
            <div className="small-search">
              <i className="ph-bold ph-funnel"></i>
              <input
                className="q-input"
                type="text"
                placeholder="Filtrar alunos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <form className="student-create-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="input-group">
              <label>NOME</label>
              <input
                className="q-input"
                type="text"
                placeholder="Ex: João Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>OBJETIVO</label>
              <input
                className="q-input"
                type="text"
                placeholder="Hipertrofia"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>PESO (kg)</label>
              <input
                className="q-input"
                type="number"
                placeholder="80"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>CONSUMO (kcal)</label>
              <input
                className="q-input"
                type="number"
                placeholder="2500"
                value={form.kcal}
                onChange={(e) => setForm({ ...form, kcal: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem' }}>
            <i className="ph-bold ph-plus"></i> Adicionar Aluno
          </button>
        </form>

        <div className="section-header" style={{ marginTop: '1rem' }}>
          <h3>Aluno selecionado</h3>
        <div className="section-actions">
            <select
              className="q-input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedStudent && (
            <div className="selected-student-card">
              <div>
                <h4>{selectedStudent.name}</h4>
                <span>{selectedStudent.goal || 'Objetivo não informado'}</span>
              </div>
              <div className="selected-student-meta">
                <span>Peso: {selectedStudent.weight ? `${selectedStudent.weight} kg` : '--'}</span>
                <span>Meta: {selectedStudent.kcal ? `${selectedStudent.kcal} kcal` : '--'}</span>
              </div>
            </div>
          )}
        <div className="section-actions" style={{ marginTop: '0.75rem', gap: '0.75rem', display: 'flex', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={handleSeedWorkouts}>
            <i className="ph-bold ph-barbell"></i> Salvar treino de exemplo
          </button>
          <button type="button" className="btn-secondary" onClick={handleSeedDiet}>
            <i className="ph-bold ph-apple-logo"></i> Salvar dieta de exemplo
          </button>
        </div>

        {statusMessage && <p className="text-muted" style={{ marginTop: '0.5rem' }}>{statusMessage}</p>}

        <div className="trainer-editor-grid">
          <section className="trainer-editor-card">
            <div className="section-header">
              <div>
                <h3>Treino do aluno</h3>
                <p className="subtitle">Edite e salve para aparecer no app do aluno.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={addBlock}>
                <i className="ph-bold ph-plus"></i> Novo bloco
              </button>
            </div>

            <div className="trainer-plan-list">
              {workoutBlocks.map((block, blockIdx) => (
                <div key={blockIdx} className="trainer-plan-block">
                  <div className="trainer-plan-header">
                    <input
                      className="q-input"
                      value={block.title}
                      onChange={(e) => updateBlock(blockIdx, { title: e.target.value })}
                    />
                    <button type="button" className="btn-icon" onClick={() => removeBlock(blockIdx)}>
                      <i className="ph-bold ph-trash"></i>
                    </button>
                  </div>

                  <div className="trainer-exercise-list">
                    {(block.exercises || []).map((ex, exIdx) => (
                      <div key={exIdx} className="trainer-exercise-row">
                        <div className="trainer-exercise-main">
                          <input
                            className="q-input"
                            value={ex.name}
                            onChange={(e) => updateExercise(blockIdx, exIdx, { name: e.target.value })}
                            placeholder="Exercício"
                          />
                          <textarea
                            className="q-input"
                            value={ex.note || ''}
                            onChange={(e) => updateExercise(blockIdx, exIdx, { note: e.target.value })}
                            placeholder="Observações do exercício"
                            rows={2}
                          />
                        </div>
                        <div className="trainer-exercise-meta">
                          <label>Séries</label>
                          <input
                            className="q-input"
                            value={ex.series}
                            onChange={(e) => updateExercise(blockIdx, exIdx, { series: e.target.value })}
                          />
                          <label>Reps</label>
                          <input
                            className="q-input"
                            value={ex.reps}
                            onChange={(e) => updateExercise(blockIdx, exIdx, { reps: e.target.value })}
                          />
                          <label>Carga</label>
                          <input
                            className="q-input"
                            value={ex.load}
                            onChange={(e) => updateExercise(blockIdx, exIdx, { load: e.target.value })}
                          />
                          <label>Descanso</label>
                          <input
                            className="q-input"
                            value={ex.rest}
                            onChange={(e) => updateExercise(blockIdx, exIdx, { rest: e.target.value })}
                          />
                          <button type="button" className="btn-icon" onClick={() => removeExercise(blockIdx, exIdx)}>
                            <i className="ph-bold ph-x"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" className="btn-secondary" onClick={() => addExercise(blockIdx)}>
                    <i className="ph-bold ph-plus"></i> Adicionar exercício
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn-primary" onClick={handleSaveWorkoutPlan}>
              <i className="ph-bold ph-floppy-disk"></i> Salvar treino do aluno
            </button>
            {planStatus && <p className="text-muted" style={{ marginTop: '0.5rem' }}>{planStatus}</p>}
          </section>

          <section className="trainer-editor-card">
            <div className="section-header">
              <div>
                <h3>Dieta do aluno</h3>
                <p className="subtitle">Atualize as refeições e macronutrientes.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={addMeal}>
                <i className="ph-bold ph-plus"></i> Nova refeição
              </button>
            </div>

            <div className="trainer-meal-list">
              {dietMeals.map((meal, mealIdx) => (
                <div key={mealIdx} className="trainer-meal-card">
                  <div className="trainer-plan-header">
                    <input
                      className="q-input"
                      value={meal.name}
                      onChange={(e) => updateMeal(mealIdx, { name: e.target.value })}
                      placeholder="Nome da refeição"
                    />
                    <button type="button" className="btn-icon" onClick={() => removeMeal(mealIdx)}>
                      <i className="ph-bold ph-trash"></i>
                    </button>
                  </div>
                  <div className="trainer-meal-items">
                    {(meal.items || []).map((item, itemIdx) => (
                      <div key={itemIdx} className="trainer-meal-item">
                        <input
                          className="q-input"
                          value={item.name}
                          onChange={(e) => updateMealItem(mealIdx, itemIdx, { name: e.target.value })}
                          placeholder="Alimento"
                        />
                        <input
                          className="q-input"
                          value={item.qty}
                          onChange={(e) => updateMealItem(mealIdx, itemIdx, { qty: e.target.value })}
                          placeholder="Quantidade"
                        />
                        <input
                          className="q-input"
                          type="number"
                          value={item.kcal}
                          onChange={(e) => updateMealItem(mealIdx, itemIdx, { kcal: Number(e.target.value) || 0 })}
                          placeholder="kcal"
                        />
                        <input
                          className="q-input"
                          type="number"
                          value={item.prot}
                          onChange={(e) => updateMealItem(mealIdx, itemIdx, { prot: Number(e.target.value) || 0 })}
                          placeholder="Prot"
                        />
                        <input
                          className="q-input"
                          type="number"
                          value={item.carb}
                          onChange={(e) => updateMealItem(mealIdx, itemIdx, { carb: Number(e.target.value) || 0 })}
                          placeholder="Carb"
                        />
                        <input
                          className="q-input"
                          type="number"
                          value={item.fat}
                          onChange={(e) => updateMealItem(mealIdx, itemIdx, { fat: Number(e.target.value) || 0 })}
                          placeholder="Gord"
                        />
                        <button type="button" className="btn-icon" onClick={() => removeMealItem(mealIdx, itemIdx)}>
                          <i className="ph-bold ph-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => addMealItem(mealIdx)}>
                    <i className="ph-bold ph-plus"></i> Adicionar alimento
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn-primary" onClick={handleSaveDietPlan}>
              <i className="ph-bold ph-floppy-disk"></i> Salvar dieta do aluno
            </button>
            {dietStatus && <p className="text-muted" style={{ marginTop: '0.5rem' }}>{dietStatus}</p>}
          </section>
        </div>

        <StudentList students={filtered} />
      </div>
    </div>
  );
}

export default TrainerStudentsView;







