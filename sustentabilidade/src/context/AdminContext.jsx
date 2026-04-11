import { createContext, useContext, useEffect, useState } from 'react';
import {
  adminFetch,
  getAdminToken,
  hasApiConfigured,
  readJsonOrEmpty,
  setAdminToken,
} from '../services/adminApi.js';

const AdminContext = createContext(null);

function mapAdminError(code) {
  const messages = {
    invalid_credentials: 'E-mail ou senha de administrador incorretos.',
    admin_only: 'Acesso restrito ao painel administrativo.',
    invalid_password: 'A nova senha deve ter pelo menos 6 caracteres.',
    missing_password_fields: 'Preencha a senha atual e a nova senha.',
    unauthorized: 'Sua sessao admin expirou. Entre novamente.',
  };

  return messages[code] || 'Nao foi possivel concluir a operacao.';
}

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!hasApiConfigured() || !getAdminToken()) {
        setLoading(false);
        return;
      }

      try {
        const res = await adminFetch('/api/admin/me');
        const data = await readJsonOrEmpty(res);

        if (!res.ok) {
          setAdminToken(null);
          if (!cancelled) setAdminUser(null);
          return;
        }

        if (!cancelled) {
          setAdminUser(data.user || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loginAdmin({ email, password }) {
    if (!hasApiConfigured()) {
      return {
        ok: false,
        error: 'Defina VITE_API_URL para usar o painel admin com o backend real.',
      };
    }

    const res = await adminFetch('/api/admin/login', {
      method: 'POST',
      body: { email, password },
    });
    const data = await readJsonOrEmpty(res);

    if (!res.ok) {
      return { ok: false, error: mapAdminError(data.error) };
    }

    setAdminToken(data.token);
    setAdminUser(data.user || null);
    return { ok: true, user: data.user };
  }

  async function refreshAdmin() {
    const token = getAdminToken();
    if (!token) {
      setAdminUser(null);
      return null;
    }

    const res = await adminFetch('/api/admin/me');
    const data = await readJsonOrEmpty(res);

    if (!res.ok) {
      setAdminToken(null);
      setAdminUser(null);
      return null;
    }

    setAdminUser(data.user || null);
    return data.user || null;
  }

  async function changeAdminPassword({ currentPassword, newPassword }) {
    const res = await adminFetch('/api/admin/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
    const data = await readJsonOrEmpty(res);

    if (!res.ok) {
      return { ok: false, error: mapAdminError(data.error) };
    }

    return { ok: true };
  }

  function logoutAdmin() {
    setAdminToken(null);
    setAdminUser(null);
  }

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        loading,
        loginAdmin,
        refreshAdmin,
        changeAdminPassword,
        logoutAdmin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

/* eslint-disable react-refresh/only-export-components -- hook exposto junto do Provider */
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin deve ser usado dentro de AdminProvider');
  return ctx;
}
