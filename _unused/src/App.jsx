import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import TrainerDashboard from './pages/TrainerDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TrainerStatsView from './pages/TrainerDashboard/TrainerStatsView';
import TrainerStudentsView from './pages/TrainerDashboard/TrainerStudentsView';
import TrainerMessagesView from './pages/TrainerDashboard/TrainerMessagesView';
import TrainerExercisesView from './pages/TrainerDashboard/TrainerExercisesView';
import TrainerSettingsView from './pages/TrainerDashboard/TrainerSettingsView';
import StudentHomeView from './pages/StudentDashboard/StudentHomeView';
import StudentWorkoutView from './pages/StudentDashboard/StudentWorkoutView';
import StudentDietView from './pages/StudentDashboard/StudentDietView';
// Importaremos as outras sub-páginas conforme a migração avança

function App() {
  return (
    <Router>
      <div id="app">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
        
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/trainer" element={<TrainerDashboard />}>
            <Route index element={<TrainerStatsView />} />
            <Route path="alunos" element={<TrainerStudentsView />} />
            <Route path="duvidas" element={<TrainerMessagesView />} />
            <Route path="exercicios" element={<TrainerExercisesView />} />
            <Route path="configuracoes" element={<TrainerSettingsView />} />
          </Route>
          <Route path="/student" element={<StudentDashboard />}>
            <Route index element={<StudentHomeView />} />
            <Route path="treino" element={<StudentWorkoutView />} />
            <Route path="dieta" element={<StudentDietView />} />
          </Route>
          {/* Outras rotas serão adicionadas aqui */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
