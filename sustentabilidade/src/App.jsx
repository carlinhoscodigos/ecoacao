import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AdminProvider, useAdmin } from './context/AdminContext.jsx';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ActionsPage from './pages/ActionsPage';
import RankingPage from './pages/RankingPage';
import AboutProjectPage from './pages/AboutProjectPage';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminPanelPage from './pages/AdminPanelPage.jsx';

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

function AdminPrivateRoute({ children }) {
  const { adminUser, loading } = useAdmin();
  if (loading) return null;
  return adminUser ? children : <Navigate to="/admin/login" replace />;
}

function AdminPublicRoute({ children }) {
  const { adminUser, loading } = useAdmin();
  if (loading) return null;
  return adminUser ? <Navigate to="/admin" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/admin/login"
        element={
          <AdminPublicRoute>
            <AdminLoginPage />
          </AdminPublicRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminPrivateRoute>
            <AdminPanelPage />
          </AdminPrivateRoute>
        }
      />

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
        <AdminProvider>
          <AppRoutes />
        </AdminProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
