import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <Dumbbell size={40} />
                </div>
            </motion.div>

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-bold mb-4 tracking-tight"
            >
                Consultoria Elite
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-zinc-400 mb-10 max-w-sm"
            >
                Seu corpo, sua melhor versão. Acompanhamento próximo do treinador e foco
                total em performance.
            </motion.p>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-sm space-y-4"
            >
                <Link
                    to="/login"
                    className="flex w-full items-center justify-center py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-lg hover:bg-emerald-400 transition-colors"
                >
                    Acessar Plataforma
                </Link>
            </motion.div>
        </div>
    );
}
