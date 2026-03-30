export const demoWorkouts = [
  {
    title: 'Treino A - Peito e Tríceps',
    exercises: [
      { name: 'Supino Reto Barra', series: '4', reps: '8', load: '40', rest: '60s', note: 'Controle a descida em 2 segundos.' },
      { name: 'Crucifixo Inclinado', series: '3', reps: '12', load: '14', rest: '45s', note: 'Amplitude completa sem perder controle.' },
      { name: 'Tríceps Corda', series: '3', reps: '12', load: '20', rest: '45s', note: 'Cotovelos fixos ao lado do corpo.' }
    ]
  },
  {
    title: 'Treino B - Costas e Bíceps',
    exercises: [
      { name: 'Puxada Alta Frente', series: '4', reps: '10', load: '45', rest: '60s', note: 'Puxe para o peitoral mantendo tronco estável.' },
      { name: 'Remada Curvada', series: '3', reps: '10', load: '35', rest: '60s', note: 'Mantenha lombar neutra.' },
      { name: 'Rosca Direta', series: '3', reps: '12', load: '20', rest: '45s', note: 'Evite balançar o corpo.' }
    ]
  }
];

export const demoMeals = [
  {
    name: 'Café da Manhã',
    items: [
      { name: 'Ovos mexidos', qty: '3 un', kcal: 240, prot: 18, carb: 2, fat: 16 },
      { name: 'Aveia', qty: '40 g', kcal: 154, prot: 5, carb: 26, fat: 3 }
    ]
  },
  {
    name: 'Almoço',
    items: [
      { name: 'Frango grelhado', qty: '180 g', kcal: 297, prot: 55, carb: 0, fat: 6 },
      { name: 'Arroz', qty: '140 g', kcal: 182, prot: 4, carb: 39, fat: 0 }
    ]
  }
];

export const demoStudents = [
  { id: '001', name: 'João Silva', goal: 'Hipertrofia', weight: 82, kcal: 2800, status: 'active', statusText: 'Ativo' },
  { id: '002', name: 'Maria Souza', goal: 'Emagrecimento', weight: 68, kcal: 1800, status: 'active', statusText: 'Ativo' }
];
