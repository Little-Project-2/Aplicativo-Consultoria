import { supabase } from './supabase';

/**
 * Realiza o login de um usuário utilizando e-mail e senha.
 */
export const loginWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

/**
 * Cria a conta de um novo usuário.
 */
export const registerWithEmail = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata, // Pode enviar "role: 'student'" ou "name: 'Nicolas'" aqui.
        }
    });

    if (error) throw error;
    return data;
};

/**
 * Encerra a sessão ativa do usuário.
 */
export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

/**
 * Retorna a sessão ativa atual.
 */
export const getActiveSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
};
