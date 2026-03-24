import React from 'react';
import StudentList from '../../components/StudentList';

function TrainerStudentsView() {
  const [activeStudents, setActiveStudents] = React.useState([
    { id: '001', name: 'João Silva', goal: 'Hipertrofia', weight: 82, kcal: 2800, status: 'active', statusText: 'Ativo' },
    { id: '002', name: 'Maria Souza', goal: 'Emagrecimento', weight: 68, kcal: 1800, status: 'active', statusText: 'Ativo' },
  ]);

  return (
    <div id="view-alunos">
      <div className="students-section">
        <div className="section-header">
          <h2>Alunos Ativos</h2>
          <div className="section-actions">
            <div className="small-search">
              <i className="ph-bold ph-funnel"></i>
              <input type="text" placeholder="Filtrar alunos..." />
            </div>
          </div>
        </div>
        <StudentList students={activeStudents} />
      </div>
    </div>
  );
}

export default TrainerStudentsView;
