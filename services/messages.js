// services/messages.js
// Funções de Mensagens (Chat) entre Treinador e Aluno via Supabase
// Depende de: supabase.js (window.supabase deve estar disponível)

/**
 * Envia uma mensagem de um usuário para outro.
 * @param {string} senderId - UUID de quem está enviando
 * @param {string} receiverId - UUID de quem vai receber
 * @param {string} content - Texto da mensagem
 */
async function enviarMensagem(senderId, receiverId, content) {
    const { data, error } = await window.supabase
        .from('messages')
        .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            content: content.trim(),
            read: false
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Erro ao enviar mensagem:', error.message);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

/**
 * Busca todo o histórico de mensagens entre dois usuários.
 * @param {string} userId1
 * @param {string} userId2
 * @param {number} limite - Número máximo de mensagens (padrão: 50)
 */
async function buscarConversa(userId1, userId2, limite = 50) {
    const { data, error } = await window.supabase
        .from('messages')
        .select('*')
        .or(
            `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
        )
        .order('created_at', { ascending: true })
        .limit(limite);

    if (error) {
        console.error('❌ Erro ao buscar conversa:', error.message);
        return [];
    }

    return data;
}

/**
 * Marca todas as mensagens recebidas por um usuário como lidas.
 * @param {string} receiverId - UUID do usuário que leu as mensagens
 * @param {string} senderId - UUID de quem enviou as mensagens a serem marcadas
 */
async function marcarMensagensComoLidas(receiverId, senderId) {
    const { error } = await window.supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', receiverId)
        .eq('sender_id', senderId)
        .eq('read', false);

    if (error) {
        console.error('❌ Erro ao marcar mensagens como lidas:', error.message);
        return { success: false };
    }

    return { success: true };
}

/**
 * Conta as mensagens não lidas de um usuário.
 * @param {string} userId - UUID do usuário
 * @returns {Promise<number>}
 */
async function contarMensagensNaoLidas(userId) {
    const { count, error } = await window.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('read', false);

    if (error) {
        console.error('❌ Erro ao contar mensagens não lidas:', error.message);
        return 0;
    }

    return count ?? 0;
}

window.MessagesService = {
    enviarMensagem,
    buscarConversa,
    marcarMensagensComoLidas,
    contarMensagensNaoLidas
};

console.log('✅ services/messages.js carregado!');
