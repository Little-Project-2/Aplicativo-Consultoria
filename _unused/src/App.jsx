import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Status from './pages/Status';
import ProfileSetup from './pages/ProfileSetup';
import StudentConnect from './pages/StudentConnect';
import { getSession } from './state/session';

function RequireAuth({ role, children }) {
  const session = getSession();
  if (!session) return <Navigate to="/" replace />;
  if (role && session.role !== role) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <div id="app">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/student-connect" element={<StudentConnect />} />
          <Route
            path="/trainer"
            element={
              <RequireAuth role="trainer">
                <TrainerDashboard />
              </RequireAuth>
            }
          >
            <Route index element={<TrainerStatsView />} />
            <Route path="alunos" element={<TrainerStudentsView />} />
            <Route path="duvidas" element={<TrainerMessagesView />} />
            <Route path="exercicios" element={<TrainerExercisesView />} />
            <Route path="configuracoes" element={<TrainerSettingsView />} />
          </Route>
          <Route
            path="/student"
            element={
              <RequireAuth role="student">
                <StudentDashboard />
              </RequireAuth>
            }
          >
            <Route index element={<StudentHomeView />} />
            <Route path="treino" element={<StudentWorkoutView />} />
            <Route path="dieta" element={<StudentDietView />} />
          </Route>
          <Route
            path="/status"
            element={
              <RequireAuth role="trainer">
                <Status />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
