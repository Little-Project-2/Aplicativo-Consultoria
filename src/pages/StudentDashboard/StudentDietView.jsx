import React, { useEffect, useState } from 'react';
import { demoMeals } from '../../data/demoData';
import useLocalStorage from '../../hooks/useLocalStorage';
import { fetchStudents, fetchDietPlan } from '../../services/supabaseData';

function StudentDietView() {
  const [selectedId, setSelectedId] = useLocalStorage('currentStudentId', '');
  const [meals, setMeals] = useState([]);

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
        const plan = await fetchDietPlan(selectedId);
        setMeals(plan?.meals || demoMeals);
      } catch {
        setMeals(demoMeals);
      }
    };

    load();
  }, [selectedId, setSelectedId]);

  return (
    <div id="student-diet-screen">
      <div className="section-header">
        <h2>Seu Plano Alimentar</h2>
      </div>
      <div className="meal-list">
        {meals.map((meal, i) => (
          <div key={i} className="meal-card">
            <div className="meal-card-icon">
              <i className="ph-fill ph-fork-knife"></i>
            </div>
            <div className="meal-card-info">
              <h3>{meal.name}</h3>
              <span>{meal.items.reduce((acc, item) => acc + item.kcal, 0)} kcal estimada</span>
            </div>
            <i className="ph-bold ph-caret-right"></i>
            <div className="meal-detail-list">
              {meal.items.map((item, idx) => (
                <div key={idx} className="meal-detail-row">
                  <strong>{item.name}</strong>
                  <span>{item.qty} • {item.kcal} kcal • P {item.prot}g • C {item.carb}g • G {item.fat}g</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentDietView;
