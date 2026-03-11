import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Clock, Pause, StopCircle } from 'lucide-react';
import { useWorkoutStore } from '@/stores/workoutStore';

export default function Workout() {
    const { activeWorkoutId, startWorkout, finishWorkout, elapsedSeconds } = useWorkoutStore();
    const [localSeconds, setLocalSeconds] = useState(elapsedSeconds);

    // Mock dados p/ UI (Na versão final, usa o hook useStudentWorkouts(userId))
    const workoutPlan = [
        { id: 1, title: 'Treino A - Peito e Tríceps', duration: '60 min', exercisesCount: 6 },
        { id: 2, title: 'Treino B - Costas e Bíceps', duration: '50 min', exercisesCount: 5 },
    ];

    // Temporizador do Treino Ativo (recupera estado persistido do Zustand)
    useEffect(() => {
        let interval;
        if (activeWorkoutId) {
            interval = setInterval(() => {
                setLocalSeconds((prev) => prev + 1);
                // Nota: O ideal é armazenar o timestamp no Zustand e calcular Date.now() - startTime
                // Para fins demonstrativos de UI usamos o setInterval
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeWorkoutId]);

    const activeWorkout = workoutPlan.find(w => w.id === activeWorkoutId);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleStart = (workoutId) => {
        startWorkout(workoutId);
        setLocalSeconds(0);
    };

    return (
        <div className="p-4 pt-safe pb-24 min-h-screen">
            <header className="mb-6 mt-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Meu Treino
                </h1>
                <p className="text-zinc-400 text-sm mt-1">Siga as orientações do seu treinador</p>
            </header>

            <AnimatePresence mode="popLayout">
                {/* EXIBIR TREINO EM ANDAMENTO */}
                {activeWorkout && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 mb-8 sticky top-4 z-10 backdrop-blur-md"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">
                                    Treino em Andamento
                                </p>
                                <h3 className="text-lg font-bold text-white">{activeWorkout.title}</h3>
                            </div>
                            <div className="text-2xl font-mono text-emerald-400 font-bold bg-emerald-950/50 px-3 py-1 rounded-lg">
                                {formatTime(localSeconds)}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                finishWorkout();
                                setLocalSeconds(0);
                            }}
                            className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <StopCircle className="w-5 h-5" /> Finalizar Treino
                        </button>
                    </motion.div>
                )}

                {/* LISTA DE TREINOS DISPONÍVEIS */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-zinc-100 mb-2">Cronograma</h2>
                    {workoutPlan.map((workout) => {
                        const isThisActive = activeWorkoutId === workout.id;

                        return (
                            <motion.div
                                layout
                                key={workout.id}
                                className={`p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden transition-colors ${isThisActive ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900 border-zinc-800'
                                    } border`}
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">{workout.title}</h3>
                                    <div className="flex gap-4 items-center text-zinc-500 text-xs mt-2 font-medium">
                                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {workout.duration}</span>
                                        <span className="flex items-center gap-1.5"><Dumbbell className="w-4 h-4" /> {workout.exercisesCount} exercícios</span>
                                    </div>
                                </div>

                                {!activeWorkoutId && (
                                    <button
                                        onClick={() => handleStart(workout.id)}
                                        className="bg-zinc-100 text-zinc-950 hover:bg-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors w-full mt-2"
                                    >
                                        <Play className="w-4 h-4 fill-zinc-950" /> Iniciar Treino
                                    </button>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            </AnimatePresence>
        </div>
    );
}
