import React from 'react';

function TrainerSettingsView() {
  return (
    <div id="view-config">
      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Perfil do Treinador</h2>
            <p className="subtitle">Edite sua bio, foto e especialidades exibidas aos alunos.</p>
          </div>
          <div className="settings-field">
            <label>Bio e descrição</label>
            <textarea className="q-input" rows="3" placeholder="Ex: Treinador focado em performance..."></textarea>
          </div>
        </section>
      </div>
      <div className="settings-footer">
        <button className="btn-primary">Salvar configurações</button>
      </div>
    </div>
  );
}

export default TrainerSettingsView;
