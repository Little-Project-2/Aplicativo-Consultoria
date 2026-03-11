import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useWorkoutStore = create(
    persist(
        (set, get) => ({
            activeWorkoutId: null,      // ID do treino atualmente em progresso
            startTime: null,            // Momento em que o treino começou (timestamp)
            completedSets: {},          // Guarda as séries concluídas ex: { 'exercise-id-1': [1,2], 'exercise-id-2': [1] }
            elapsedSeconds: 0,          // Tempo decorrido (útil caso a tela feche)

            // Iniciar o treino 
            startWorkout: (workoutId) => set({
                activeWorkoutId: workoutId,
                startTime: Date.now(),
                completedSets: {},
                elapsedSeconds: 0
            }),

            // Registrar que uma série (set) de um exercício foi concluída/marcada
            toggleSetCompletion: (exerciseId, setIndex) => set((state) => {
                const currentSets = state.completedSets[exerciseId] || [];
                const isCompleted = currentSets.includes(setIndex);

                let newSets;
                if (isCompleted) {
                    // Remove a série (desmarcou)
                    newSets = currentSets.filter(index => index !== setIndex);
                } else {
                    // Adiciona a série (marcou)
                    newSets = [...currentSets, setIndex];
                }

                return {
                    completedSets: {
                        ...state.completedSets,
                        [exerciseId]: newSets,
                    }
                };
            }),

            // Finalizar e limpar o treino salvo localmente
            finishWorkout: () => set({
                activeWorkoutId: null,
                startTime: null,
                completedSets: {},
                elapsedSeconds: 0
            }),

        }),
        {
            name: 'elite-workout-storage', // Nome da chave que será salva no localStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);
