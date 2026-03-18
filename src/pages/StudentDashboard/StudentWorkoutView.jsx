import React from 'react';

function StudentWorkoutView() {
  const [workouts, setWorkouts] = React.useState([
    { title: 'Treino A - Peito e Triceps', exercises: 5 },
    { title: 'Treino B - Costas e Biceps', exercises: 6 },
  ]);

  return (
    <div id="student-workout-screen">
      <div className="section-header">
        <h2>Seu Plano de Treino</h2>
      </div>
      <div className="workout-blocks">
        {workouts.map((w, i) => (
          <div key={i} className="workout-card">
            <div className="workout-card-icon">
              <i className="ph-fill ph-barbell"></i>
            </div>
            <div className="workout-card-info">
              <h3>{w.title}</h3>
              <span>{w.exercises} exercícios</span>
            </div>
            <button className="btn-start-workout">Iniciar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentWorkoutView;
