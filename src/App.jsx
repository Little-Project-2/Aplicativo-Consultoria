import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';

// Layouts
import StudentLayout from '@/layouts/StudentLayout';

// Páginas (Placeholder temporário para as que ainda não criamos)
const Home = () => <div className="p-8"><h1 className="text-2xl font-bold">Início Provisório</h1></div>;
const Login = () => <div className="p-8"><h1 className="text-2xl font-bold">Login Provisório</h1></div>;
const Dashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-zinc-400 mt-2">Bem-vindo, Aluno!</p></div>;
const Diet = () => <div className="p-8"><h1 className="text-2xl font-bold">Minha Dieta</h1></div>;
const Profile = () => <div className="p-8"><h1 className="text-2xl font-bold">Meu Perfil</h1></div>;

// Componente Real (Criaremos a seguir)
import Workout from '@/pages/student/Workout';


const queryClient = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AnimatePresence mode="wait">
                    <Routes>
                        {/* Rotas Públicas */}
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />

                        {/* Rotas Protegidas Aluno */}
                        <Route path="/student" element={<StudentLayout />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="workout" element={<Workout />} />
                            <Route path="diet" element={<Diet />} />
                            <Route path="profile" element={<Profile />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AnimatePresence>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
