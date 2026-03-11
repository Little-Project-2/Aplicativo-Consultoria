import { Outlet, NavLink } from 'react-router-dom';
import { Home, Dumbbell, Utensils, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentLayout() {
    const navItems = [
        { to: '/student/dashboard', icon: Home, label: 'Início' },
        { to: '/student/workout', icon: Dumbbell, label: 'Treino' },
        { to: '/student/diet', icon: Utensils, label: 'Dieta' },
        { to: '/student/profile', icon: User, label: 'Perfil' },
    ];

    return (
        <div className="flex flex-col min-h-[100dvh] bg-zinc-950 text-zinc-50 font-sans">
            {/* Dynamic Page Content */}
            <main className="flex-1 overflow-y-auto pb-20">
                <Outlet />
            </main>

            {/* Persistent Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 pb-safe pt-2">
                <ul className="flex justify-around items-center px-2">
                    {navItems.map((item) => (
                        <li key={item.to} className="flex-1">
                            <NavLink
                                to={item.to}
                                className={({ isActive }) =>
                                    `flex flex-col items-center py-2 transition-colors relative ${isActive ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-indicator"
                                                className="absolute -top-2 left-1/2 w-8 h-1 bg-emerald-500 rounded-b-md -translate-x-1/2"
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}
