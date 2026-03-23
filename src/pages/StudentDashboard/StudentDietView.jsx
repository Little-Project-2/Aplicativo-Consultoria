import React from 'react';

function StudentDietView() {
  const [meals, setMeals] = React.useState([
    { name: 'Café da Manhã', calories: 450 },
    { name: 'Almoço', calories: 750 },
  ]);

  return (
    <div id="student-diet-screen">
      <div className="section-header">
        <h2>Seu Plano Alimentar</h2>
      </div>
      <div className="meal-list">
        {meals.map((m, i) => (
          <div key={i} className="meal-card">
            <div className="meal-card-icon">
              <i className="ph-fill ph-fork-knife"></i>
            </div>
            <div className="meal-card-info">
              <h3>{m.name}</h3>
              <span>{m.calories} kcal estimada</span>
            </div>
            <i className="ph-bold ph-caret-right"></i>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentDietView;
