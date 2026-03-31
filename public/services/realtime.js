// services/realtime.js
// Ouvintes em tempo real (Realtime) do Supabase para Treinador e Aluno
// Depende de: supabase.js (window.supabase deve estar disponivel)

let _monitoramentoChannel = null;
let _mensagensChannel = null;
let _studentWorkoutChannel = null;
let _studentDietChannel = null;

/**
 * Inicia o ouvinte de treinos em tempo real.
 * Dispara um aviso visual no dashboard do Treinador quando um aluno finaliza um treino.
 * @param {string} trainerId - UUID do treinador logado (opcional)
 */
function startTrainerRealtimeListener(trainerId) {
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
                console.log('Aluno finalizou um treino!', payload.new);

                let nomeAluno = 'Um aluno';
                const { data: alunoRow } = await window.supabase
                    .from('students')
                    .select('data')
                    .eq('id', payload.new.student_id)
                    .maybeSingle();
                if (alunoRow?.data?.name) nomeAluno = alunoRow.data.name;

                const treinoNome = payload.new?.data?.title || payload.new?.treino_realizado || 'um treino';
                const mensagem = `${nomeAluno} acabou de finalizar: ${treinoNome}!`;

                if (typeof showToast === 'function') {
                    showToast(mensagem, 'success');
                } else {
                    console.log('Notificacao Realtime:', mensagem);
                }

                if (typeof updateTrainerStats === 'function') updateTrainerStats();
                if (typeof renderTrainerStudentList === 'function') renderTrainerStudentList();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime ativo: monitorando treinos dos alunos.');
            }
        });
}

/**
 * Inicia o ouvinte de novas mensagens do chat em tempo real.
 * @param {string} userId - UUID do usuario logado (treinador ou aluno)
 * @param {Function} callback - Funcao chamada ao receber mensagem nova
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
                console.log('Nova mensagem recebida!', payload.new);
                if (typeof callback === 'function') {
                    callback(payload.new);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime ativo: ouvindo mensagens para', userId);
            }
        });
}

function startStudentWorkoutRealtimeListener(studentId) {
    if (!studentId) return;
    if (_studentWorkoutChannel) {
        window.supabase.removeChannel(_studentWorkoutChannel);
    }

    _studentWorkoutChannel = window.supabase
        .channel(`student-workout-${studentId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'students', filter: `id=eq.${studentId}` },
            (payload) => {
                const row = payload.new;
                const data = row?.data || {};
                if (!data || typeof data !== 'object') return;

                const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
                const idx = students.findIndex(s => String(s.id) === String(studentId));
                if (idx >= 0) students[idx] = { ...students[idx], ...data };
                else students.push({ ...data, id: String(studentId) });
                localStorage.setItem('trainerStudents', JSON.stringify(students));

                if (typeof handleStudentDataUpdate === 'function') {
                    handleStudentDataUpdate({ studentId: String(studentId), reason: 'workout_plan_updated' });
                }
            }
        )
        .subscribe();
}

function startStudentDietRealtimeListener(studentId) {
    if (!studentId) return;
    if (_studentDietChannel) {
        window.supabase.removeChannel(_studentDietChannel);
    }

    _studentDietChannel = window.supabase
        .channel(`student-diet-${studentId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'students', filter: `id=eq.${studentId}` },
            (payload) => {
                const row = payload.new;
                const data = row?.data || {};
                if (!data || typeof data !== 'object') return;

                const students = JSON.parse(localStorage.getItem('trainerStudents') || '[]');
                const idx = students.findIndex(s => String(s.id) === String(studentId));
                if (idx >= 0) students[idx] = { ...students[idx], ...data };
                else students.push({ ...data, id: String(studentId) });
                localStorage.setItem('trainerStudents', JSON.stringify(students));

                if (typeof handleStudentDataUpdate === 'function') {
                    handleStudentDataUpdate({ studentId: String(studentId), reason: 'diet_plan_updated' });
                }
            }
        )
        .subscribe();
}

function stopStudentRealtimeListeners() {
    if (_studentWorkoutChannel) {
        window.supabase.removeChannel(_studentWorkoutChannel);
        _studentWorkoutChannel = null;
    }
    if (_studentDietChannel) {
        window.supabase.removeChannel(_studentDietChannel);
        _studentDietChannel = null;
    }
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
    stopStudentRealtimeListeners();
    console.log('Todos os canais Realtime encerrados.');
}

window.RealtimeService = {
    startTrainerRealtimeListener,
    startMessagesRealtimeListener,
    stopAllRealtimeListeners,
    startStudentWorkoutRealtimeListener,
    startStudentDietRealtimeListener,
    stopStudentRealtimeListeners
};

console.log('services/realtime.js carregado.');
