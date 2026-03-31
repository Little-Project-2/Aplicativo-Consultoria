// ─── START: database.js ───
// Este arquivo funciona como o seu "banco de dados local" de treinos para o aluno 77777.
// Você pode adicionar novos blocos, mudar nomes, cargas e exercícios livremente.
// Ao salvar o arquivo e recarregar a página, as alterações já aparecerão no aplicativo.

window.TREINOS_DB = [
    {
        title: 'Treino A - Peito e Tríceps',
        exercises: [
            { nome: 'Supino Reto Barra', series: '4', reps: '8', carga: '40', descanso: '60s', observacao: 'Controle a descida em 2 segundos.', substitutes: ['Supino Halter', 'Supino Máquina'], supersetWithNext: false },
            { nome: 'Crucifixo Inclinado', series: '3', reps: '12', carga: '14', descanso: '45s', observacao: 'Amplitude completa sem perder controle.', substitutes: ['Peck Deck'], supersetWithNext: false },
            { nome: 'Tríceps Corda', series: '3', reps: '12', carga: '20', descanso: '45s', observacao: 'Cotovelos fixos ao lado do corpo.', substitutes: ['Tríceps Barra V'], supersetWithNext: false }
        ]
    },
    {
        title: 'Treino B - Costas e Bíceps',
        exercises: [
            { nome: 'Puxada Alta Frente', series: '4', reps: '10', carga: '45', descanso: '60s', observacao: 'Puxe para o peitoral mantendo tronco estável.', substitutes: ['Puxada Neutra'], supersetWithNext: false },
            { nome: 'Remada Curvada', series: '3', reps: '10', carga: '35', descanso: '60s', observacao: 'Mantenha lombar neutra.', substitutes: ['Remada Serrote'], supersetWithNext: false },
            { nome: 'Rosca Direta', series: '3', reps: '12', carga: '20', descanso: '45s', observacao: 'Evite balançar o corpo.', substitutes: ['Rosca Alternada'], supersetWithNext: false }
        ]
    },
    {
        title: 'Treino C - Pernas e Ombros',
        exercises: [
            { nome: 'Agachamento Livre', series: '4', reps: '10', carga: '60', descanso: '90s', observacao: 'Desça até quebrar o paralelo.', substitutes: ['Leg Press'], supersetWithNext: false },
            { nome: 'Cadeira Extensora', series: '3', reps: '15', carga: '45', descanso: '45s', observacao: 'Segure 2s no pico de contração.', substitutes: ['Agachamento Búlgaro'], supersetWithNext: false },
            { nome: 'Desenvolvimento Halter', series: '3', reps: '10', carga: '16', descanso: '60s', observacao: 'Cuidado para não usar as pernas.', substitutes: ['Desenvolvimento Máquina'], supersetWithNext: false }
        ]
    }
];

// Opcional: Banco de Dieta local para testes rápidos
window.DIETA_DB = [
    {
        name: 'Café da Manhã',
        items: [
            { nome: 'Ovos mexidos', qtd: '3 un', kcal: 240, prot: 18, carb: 2, gord: 16 },
            { nome: 'Aveia', qtd: '40 g', kcal: 154, prot: 5, carb: 26, gord: 3 }
        ]
    },
    {
        name: 'Almoço',
        items: [
            { nome: 'Frango grelhado', qtd: '180 g', kcal: 297, prot: 55, carb: 0, gord: 6 },
            { nome: 'Arroz', qtd: '140 g', kcal: 182, prot: 4, carb: 39, gord: 0 }
        ]
    }
];
