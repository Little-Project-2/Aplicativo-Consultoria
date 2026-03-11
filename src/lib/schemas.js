import { z } from 'zod';

/**
 * Schema de validação Zod para o Questionário de Anamnese / Saúde do Aluno.
 * Proteção contra envios nulos, lixo ou formatos inválidos que possam quebrar os cálculos da TMB.
 */
export const healthQuestionnaireSchema = z.object({
    fullName: z.string()
        .min(3, { message: 'O nome precisa ter pelo menos 3 caracteres.' })
        .max(100, { message: 'O nome é muito longo.' }),

    age: z.number({ required_error: 'A idade é obrigatória', invalid_type_error: 'Deve ser um número' })
        .min(12, { message: 'Idade mínima de 12 anos.' })
        .max(100, { message: 'Idade inválida.' }),

    gender: z.enum(['M', 'F'], { required_error: 'Por favor, selecione seu gênero biológico para cálculos precisos.' }),

    weight: z.number({ required_error: 'O peso é obrigatório', invalid_type_error: 'Deve ser um número' })
        .min(30, { message: 'Peso inválido (muito baixo).' })
        .max(300, { message: 'Peso inválido (muito alto).' }),

    height: z.number({ required_error: 'A altura é obrigatória', invalid_type_error: 'Deve ser um número' })
        .min(100, { message: 'Altura inválida (mínimo 100cm).' })
        .max(250, { message: 'Altura inválida (máximo 250cm).' }),

    objective: z.enum(['weight_loss', 'hypertrophy', 'maintenance'], { required_error: 'Por favor, selecione o objetivo.' }),
});

/**
 * Validação rigorosa do preenchimento de carga no log de séries (Workout Log)
 */
export const workoutSetSchema = z.object({
    weightUsed: z.number()
        .min(0, { message: 'A carga não pode ser negativa.' }),
    repsDone: z.number()
        .min(1, { message: 'Você precisa realizar pelo menos 1 repetição.' }),
    rpe: z.number().min(1).max(10).optional(), // Percepção de esforço (Borg/RPE)
});
