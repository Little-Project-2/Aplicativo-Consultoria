// services/realtime.js
// Ouvintes em tempo real (Realtime) do Supabase para o Dashboard do Treinador
// Depende de: supabase.js (window.supabase deve estar disponível)

let _monitoramentoChannel = null;
let _mensagensChannel = null;

/**
 * Inicia o ouvinte de treinos em tempo real.
 * Dispara um aviso visual (Toast) no dashboard do Treinador quando um aluno finaliza um treino.
 * @param {string} trainerId - UUID do treinador logado
 */
function startTrainerRealtimeListener(trainerId) {
    // Fecha o canal anterior se já existia (evita duplicatas)
    if (_monitoramentoChannel) {
        window.supabase.removeChannel(_monitoramentoChannel);
    }

    _monitoramentoChannel = window.supabase
        .channel('monitoramento-alunos')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'workout_history'
            },
            async (payload) => {
                console.log('🏋️ Aluno finalizou um treino!', payload.new);

                // Busca o nome do aluno para exibir no aviso
                const { data: aluno } = await window.supabase
                    .from('profiles')
                    .select('nome')
                    .eq('id', payload.new.student_id)
                    .single();

                const nomeAluno = aluno?.nome || 'Um aluno';
                const treinoNome = payload.new.treino_realizado || 'um treino';
                const mensagem = `${nomeAluno} acabou de finalizar: ${treinoNome}!`;

                // Dispara o Toast visual (usa a função global do script.js)
                if (typeof showToast === 'function') {
                    showToast(mensagem, 'success');
                } else {
                    console.log('📢 Notificação Realtime:', mensagem);
                }

                // Atualiza a lista de alunos no dashboard se a função existir
                if (typeof updateTrainerStats === 'function') {
                    updateTrainerStats();
                }
                if (typeof renderTrainerStudentList === 'function') {
                    renderTrainerStudentList();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Realtime ativo: monitorando treinos dos alunos!');
            }
        });
}

/**
 * Inicia o ouvinte de novas mensagens do chat em tempo real.
 * @param {string} userId - UUID do usuário logado (treinador ou aluno)
 * @param {Function} callback - Função chamada ao receber mensagem nova (recebe o payload)
 */
function startMessagesRealtimeListener(userId, callback) {
    if (_mensagensChannel) {
        window.supabase.removeChannel(_mensagensChannel);
    }

    _mensagensChannel = window.supabase
        .channel('canal-mensagens')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            },
            (payload) => {
                console.log('💬 Nova mensagem recebida!', payload.new);
                if (typeof callback === 'function') {
                    callback(payload.new);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Realtime ativo: ouvindo mensagens para', userId);
            }
        });
}

/**
 * Para e remove todos os ouvintes em tempo real ativos.
 */
function stopAllRealtimeListeners() {
    if (_monitoramentoChannel) {
        window.supabase.removeChannel(_monitoramentoChannel);
        _monitoramentoChannel = null;
    }
    if (_mensagensChannel) {
        window.supabase.removeChannel(_mensagensChannel);
        _mensagensChannel = null;
    }
    console.log('⛔ Todos os canais Realtime (treinador) encerrados.');
}

// ─── REALTIME DO ALUNO ─────────────────────────────────────────────────────────

let _alunoTreinoChannel = null;
let _alunoDietaChannel = null;

/**
 * Inicia o ouvinte de treinos planejados em tempo real para o aluno.
 * Quando o treinador alterar o treino deste aluno, o dashboard é atualizado automaticamente.
 * @param {string} alunoId - UUID do aluno logado
 */
function startStudentWorkoutRealtimeListener(alunoId) {
    if (_alunoTreinoChannel) {
        window.supabase.removeChannel(_alunoTreinoChannel);
    }

    _alunoTreinoChannel = window.supabase
        .channel('aluno-treinos-' + alunoId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'treinos_planejados',
                filter: `aluno_id=eq.${alunoId}`
            },
            (payload) => {
                console.log('🔄 Treino atualizado pelo treinador!', payload);

                // Mostra toast visual
                if (typeof showToast === 'function') {
                    showToast('🔄 Seu treino foi atualizado pelo treinador!', 'info');
                } else {
                    console.log('📢 Treino atualizado pelo treinador!');
                }

                // Recarrega o treino no dashboard do aluno
                if (typeof openStudentWorkout === 'function') {
                    openStudentWorkout();
                }
                // Também tenta atualizar as opções de treino se disponível
                if (typeof renderWorkoutStartOptions === 'function') {
                    const student = typeof getCurrentStudent === 'function' ? getCurrentStudent() : null;
                    if (student) renderWorkoutStartOptions(student);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Realtime ativo: ouvindo treinos planejados para aluno', alunoId);
            }
        });
}

/**
 * Inicia o ouvinte de dieta em tempo real para o aluno.
 * Quando o treinador alterar a dieta deste aluno, o dashboard é atualizado automaticamente.
 * @param {string} alunoId - UUID do aluno logado
 */
function startStudentDietRealtimeListener(alunoId) {
    if (_alunoDietaChannel) {
        window.supabase.removeChannel(_alunoDietaChannel);
    }

    _alunoDietaChannel = window.supabase
        .channel('aluno-dieta-' + alunoId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'dieta',
                filter: `aluno_id=eq.${alunoId}`
            },
            (payload) => {
                console.log('🍽️ Dieta atualizada pelo treinador!', payload);

                if (typeof showToast === 'function') {
                    showToast('🍽️ Sua dieta foi atualizada pelo treinador!', 'info');
                } else {
                    console.log('📢 Dieta atualizada pelo treinador!');
                }

                // Recarrega a dieta se a função existir
                if (typeof openStudentNutrition === 'function') {
                    openStudentNutrition();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Realtime ativo: ouvindo dieta para aluno', alunoId);
            }
        });
}

/**
 * Para todos os ouvintes Realtime do aluno.
 */
function stopStudentRealtimeListeners() {
    if (_alunoTreinoChannel) {
        window.supabase.removeChannel(_alunoTreinoChannel);
        _alunoTreinoChannel = null;
    }
    if (_alunoDietaChannel) {
        window.supabase.removeChannel(_alunoDietaChannel);
        _alunoDietaChannel = null;
    }
    console.log('⛔ Canais Realtime do aluno encerrados.');
}

window.RealtimeService = {
    startTrainerRealtimeListener,
    startMessagesRealtimeListener,
    stopAllRealtimeListeners,
    startStudentWorkoutRealtimeListener,
    startStudentDietRealtimeListener,
    stopStudentRealtimeListeners
};

console.log('✅ services/realtime.js carregado!');
