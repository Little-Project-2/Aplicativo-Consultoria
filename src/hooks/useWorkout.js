import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

/**
 * Busca o cronograma de treinos de um aluno.
 * Retorna os dados do banco (Supabase) via TanStack Query para gerenciar Cache e Retry automaticamente.
 */
const fetchStudentWorkouts = async (studentId) => {
    if (!studentId) return null;

    const { data, error } = await supabase
        .from('workouts')
        .select('*, exercises(*)') // Relacionamento com tabela de exercícios
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error('Erro ao buscar o treino do aluno: ' + error.message);
    }

    return data;
};

export const useStudentWorkouts = (studentId) => {
    return useQuery({
        queryKey: ['workouts', studentId],
        queryFn: () => fetchStudentWorkouts(studentId),
        enabled: !!studentId,       // O hook só faz o fetch se houver um studentId
        staleTime: 1000 * 60 * 10,  // Os dados são válidos (fresquinhos) por 10 minutos
        cacheTime: 1000 * 60 * 60,  // Cache é limpo após 60 minutos se ninguém usar
        retry: 2,                   // Tenta buscar no máximo 2x antes de acusar erro
    });
};
