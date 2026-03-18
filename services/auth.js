// services/auth.js
// Funções de Autenticação e Perfis via Supabase
// Depende de: supabase.js (window.supabase deve estar disponível)

/**
 * Cadastra um novo usuário (Treinador ou Aluno) no Supabase Auth
 * e cria o perfil correspondente na tabela `profiles`.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.senha
 * @param {string} params.nome
 * @param {'treinador'|'aluno'} params.role
 * @param {string|null} params.trainer_id - UUID do treinador (obrigatório para alunos)
 * @param {Object} params.extras - Campos extras (idade, peso, altura, objetivo)
 */
async function cadastrarUsuario({ email, senha, nome, role, trainer_id = null, extras = {} }) {
    try {
        const { data: authData, error: authError } = await window.supabase.auth.signUp({
            email,
            password: senha
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('Usuário não criado no Auth.');

        const profilePayload = {
            id: userId,
            role,
            nome,
            status: role === 'aluno' ? 'pendente' : 'ativo',
            trainer_id: role === 'aluno' ? trainer_id : null,
            ...extras
        };

        const { error: profileError } = await window.supabase
            .from('profiles')
            .insert(profilePayload);

        if (profileError) throw profileError;

        console.log(`✅ Usuário ${role} cadastrado com sucesso!`, authData.user);
        return { success: true, user: authData.user };
    } catch (err) {
        console.error('❌ Erro ao cadastrar usuário:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Faz login de um usuário pelo email e senha.
 * @param {string} email
 * @param {string} senha
 */
async function fazerLogin(email, senha) {
    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;

        const userId = data.user?.id;

        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        console.log('✅ Login bem-sucedido!', profile);
        return { success: true, user: data.user, profile };
    } catch (err) {
        console.error('❌ Erro ao fazer login:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Faz logout do usuário atual.
 */
async function fazerLogout() {
    const { error } = await window.supabase.auth.signOut();
    if (error) {
        console.error('❌ Erro ao sair:', error.message);
        return { success: false };
    }
    console.log('✅ Logout realizado com sucesso.');
    return { success: true };
}

/**
 * Retorna o usuário logado atualmente (ou null).
 */
async function getUsuarioLogado() {
    const { data } = await window.supabase.auth.getSession();
    return data?.session?.user ?? null;
}

/**
 * Busca o perfil do usuário logado na tabela `profiles`.
 */
async function getPerfilLogado() {
    const user = await getUsuarioLogado();
    if (!user) return null;

    const { data, error } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('❌ Erro ao buscar perfil:', error.message);
        return null;
    }
    return data;
}

/**
 * Busca todos os alunos de um treinador específico.
 * @param {string} trainerId - UUID do treinador
 */
async function getAlunosDoTreinador(trainerId) {
    const { data, error } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('role', 'aluno')
        .eq('trainer_id', trainerId)
        .eq('status', 'ativo')
        .order('nome', { ascending: true });

    if (error) {
        console.error('❌ Erro ao buscar alunos ativos:', error.message);
        return [];
    }
    return data;
}

/**
 * Atualiza o status de um aluno (ex: 'ativo', 'pendente', 'inativo').
 * @param {string} studentId
 * @param {string} novoStatus
 */
async function atualizarStatusAluno(studentId, novoStatus) {
    const { error } = await window.supabase
        .from('profiles')
        .update({ status: novoStatus })
        .eq('id', studentId);

    if (error) {
        console.error('❌ Erro ao atualizar status:', error.message);
        return { success: false };
    }
    return { success: true };
}

window.AuthService = {
    cadastrarUsuario,
    fazerLogin,
    fazerLogout,
    getUsuarioLogado,
    getPerfilLogado,
    getAlunosDoTreinador,
    getAlunosAtivosDoTreinador: getAlunosDoTreinador, // Alias para manter compatibilidade ou se quiser filtrar por padrão
    atualizarStatusAluno
};

console.log('✅ services/auth.js carregado!');
