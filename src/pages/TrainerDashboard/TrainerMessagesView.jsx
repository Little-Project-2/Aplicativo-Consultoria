import React from 'react';

function TrainerMessagesView() {
  return (
    <div id="view-duvidas">
      <div className="chat-container">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header"><h3>Conversas</h3></div>
          <div className="chat-search">
            <i className="ph-bold ph-magnifying-glass"></i>
            <input className="q-input" type="text" placeholder="Buscar aluno..." />
          </div>
          <div className="chat-list">
            <div className="empty-state">Nenhuma conversa ativa</div>
          </div>
        </aside>
        <main className="chat-window">
          <div className="chat-welcome">
            <i className="ph-fill ph-chat-circle-dots"></i>
            <h3>Selecione um aluno</h3>
            <p>Escolha uma conversa ao lado para visualizar e responder as dúvidas.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default TrainerMessagesView;

