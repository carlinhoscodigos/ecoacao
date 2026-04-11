import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ActionsPage from './pages/ActionsPage';
import RankingPage from './pages/RankingPage';
import AboutProjectPage from './pages/AboutProjectPage';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useApp();
  if (loading) return null;
  return currentUser ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { currentUser, loading } = useApp();
  if (loading) return null;
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/acoes"
        element={
          <PrivateRoute>
            <ActionsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/ranking"
        element={
          <PrivateRoute>
            <RankingPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/sobre"
        element={
          <PrivateRoute>
            <AboutProjectPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
