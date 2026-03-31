// services/workouts.js
// Funções de Treinos e Dietas via Supabase
// Depende de: supabase.js (window.supabase deve estar disponível)

// ─── TREINOS ─────────────────────────────────────────────────────────────────

/**
 * Salva (ou substitui) o plano de treino de um aluno.
 * Apaga os treinos anteriores do aluno e insere os novos blocos.
 * @param {string} studentId
 * @param {string} trainerId
 * @param {Array} workoutBlocks  - Array de { title: string, exercises: Array }
 */
async function salvarTreinoDoAluno(studentId, trainerId, workoutBlocks) {
    try {
        // Remove os treinos anteriores deste aluno
        const { error: deleteError } = await window.supabase
            .from('workouts')
            .delete()
            .eq('student_id', studentId);

        if (deleteError) throw deleteError;

        // Insere os novos blocos
        const rows = workoutBlocks.map(block => ({
            student_id: studentId,
            trainer_id: trainerId,
            title: block.title,
            exercises: block.exercises
        }));

        const { error: insertError } = await window.supabase
            .from('workouts')
            .insert(rows);

        if (insertError) throw insertError;

        console.log('✅ Treinos salvos no Supabase com sucesso!');
        return { success: true };
    } catch (err) {
        console.error('❌ Erro ao salvar treinos:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Busca todos os blocos de treino de um aluno.
 * @param {string} studentId
 * @returns {Promise<Array>} Array de blocos de treino
 */
async function buscarTreinosDoAluno(studentId) {
    const { data, error } = await window.supabase
        .from('workouts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Erro ao buscar treinos:', error.message);
        return [];
    }
    return data;
}

// ─── DIETAS ──────────────────────────────────────────────────────────────────

/**
 * Salva (ou substitui) a dieta de um aluno.
 * @param {string} studentId
 * @param {string} trainerId
 * @param {Array} mealBlocks - Array de { name: string, items: Array }
 */
async function salvarDietaDoAluno(studentId, trainerId, mealBlocks) {
    try {
        // Remove a dieta anterior
        const { error: deleteError } = await window.supabase
            .from('diets')
            .delete()
            .eq('student_id', studentId);

        if (deleteError) throw deleteError;

        const { error: insertError } = await window.supabase
            .from('diets')
            .insert({
                student_id: studentId,
                trainer_id: trainerId,
                meals: mealBlocks
            });

        if (insertError) throw insertError;

        console.log('✅ Dieta salva no Supabase com sucesso!');
        return { success: true };
    } catch (err) {
        console.error('❌ Erro ao salvar dieta:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Busca a dieta atual de um aluno.
 * @param {string} studentId
 * @returns {Promise<Array>} Array de refeições
 */
async function buscarDietaDoAluno(studentId) {
    const { data, error } = await window.supabase
        .from('diets')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('❌ Erro ao buscar dieta:', error.message);
        return null;
    }
    return data;
}

// ─── HISTÓRICO DE TREINOS ─────────────────────────────────────────────────────

/**
 * Registra um treino concluído pelo aluno (chamado ao clicar em "Finalizar Treino").
 * @param {string} studentId
 * @param {string} treinoRealizado - Título do treino (ex: "Treino A - Peito e Tríceps")
 * @param {number} duracaoMinutos - Duração do treino em minutos
 */
async function registrarTreinoConcluido(studentId, treinoRealizado, duracaoMinutos = 0) {
    const { data, error } = await window.supabase
        .from('workout_history')
        .insert({
            student_id: studentId,
            data_do_treino: new Date().toISOString(),
            treino_realizado: treinoRealizado,
            duracao_minutos: duracaoMinutos
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Erro ao registrar treino concluído:', error.message);
        return { success: false, error: error.message };
    }

    console.log('✅ Treino concluído registrado!', data);
    return { success: true, data };
}

/**
 * Busca o histórico de treinos de um aluno.
 * @param {string} studentId
 * @param {number} limite - Quantos registros retornar (padrão: 30)
 */
async function buscarHistoricoDoAluno(studentId, limite = 30) {
    const { data, error } = await window.supabase
        .from('workout_history')
        .select('*')
        .eq('student_id', studentId)
        .order('data_do_treino', { ascending: false })
        .limit(limite);

    if (error) {
        console.error('❌ Erro ao buscar histórico:', error.message);
        return [];
    }
    return data;
}

// ─── RECORDES PESSOAIS ────────────────────────────────────────────────────────

/**
 * Atualiza ou cria um recorde pessoal de um aluno para um exercício.
 * Usa "upsert" para atualizar se já existir ou criar se for novo.
 * @param {string} studentId
 * @param {string} exercicio - Nome do exercício (ex: "Supino Reto")
 * @param {number} cargaMaxima - Carga em kg
 */
async function atualizarRecorde(studentId, exercicio, cargaMaxima) {
    const { data, error } = await window.supabase
        .from('personal_records')
        .upsert({
            student_id: studentId,
            exercicio,
            carga_maxima: cargaMaxima,
            data_atualizacao: new Date().toISOString()
        }, {
            onConflict: 'student_id,exercicio'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Erro ao atualizar recorde:', error.message);
        return { success: false };
    }

    console.log('🏆 Recorde atualizado!', data);
    return { success: true, data };
}

/**
 * Busca todos os recordes pessoais de um aluno.
 * @param {string} studentId
 */
async function buscarRecordesDoAluno(studentId) {
    const { data, error } = await window.supabase
        .from('personal_records')
        .select('*')
        .eq('student_id', studentId)
        .order('data_atualizacao', { ascending: false });

    if (error) {
        console.error('❌ Erro ao buscar recordes:', error.message);
        return [];
    }
    return data;
}

window.WorkoutService = {
    salvarTreinoDoAluno,
    buscarTreinosDoAluno,
    salvarDietaDoAluno,
    buscarDietaDoAluno,
    registrarTreinoConcluido,
    buscarHistoricoDoAluno,
    atualizarRecorde,
    buscarRecordesDoAluno
};

console.log('✅ services/workouts.js carregado!');
