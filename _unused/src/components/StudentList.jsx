import React from 'react';

export function StudentRow({ student }) {
  return (
    <div className="student-row">
      <div className="student-status-col">
        <span className={`status-badge ${student.status || 'active'}`}>{student.status_text || student.statusText || 'Ativo'}</span>
      </div>
      <div className="student-id-col">
        <div className="student-avatar-sm">
          <i className="ph-fill ph-user"></i>
        </div>
        <div className="student-info-text">
          <strong>{student.name}</strong>
          <span>ID: {student.id}</span>
        </div>
      </div>
      <div className="student-goal-col">
        <span className="goal-tag">{student.goal || 'Hipertrofia'}</span>
      </div>
      <div className="student-weight-col">
        <strong>{student.weight || '--'} kg</strong>
      </div>
      <div className="student-macros-col">
        <span>{student.kcal || '--'} kcal</span>
      </div>
      <div className="student-actions-col">
        <button className="btn-action-icon" title="Ver Perfil">
          <i className="ph-bold ph-caret-right"></i>
        </button>
      </div>
    </div>
  );
}

function StudentList({ students }) {
  return (
    <div className="students-section">
      <div className="section-header">
        <h2>Alunos Recentes</h2>
      </div>
      <div className="table-header-row">
        <span>STATUS</span>
        <span>IDENTIFICAÇÃO</span>
        <span>OBJETIVO</span>
        <span>PESO</span>
        <span>CONSUMO DIÁRIO</span>
        <span style={{ textAlign: 'right' }}>AÇÕES</span>
      </div>
      <div className="student-list-container">
        {students.length > 0 ? (
          students.map(student => <StudentRow key={student.id} student={student} />)
        ) : (
          <div className="empty-state">Nenhum aluno encontrado</div>
        )}
      </div>
      <div className="pagination-footer">
        <span className="text-muted">
          {students.length > 0 ? `Mostrando ${students.length} alunos` : 'Nenhum aluno'}
        </span>
      </div>
    </div>
  );
}

export default StudentList;
