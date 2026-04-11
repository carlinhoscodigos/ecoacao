import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ACTIONS_CATALOG } from '../data/actions';
import { generateId, gerarSiglaCidade } from '../utils/helpers';
import { checkLogin } from '../utils/auth';
import {
  getAllUsers,
  saveUser,
  addLog,
  getAllLogs,
  resetAllData,
  getCurrentUser,
  setCurrentUser as persistUser,
  clearCurrentUser,
} from '../services/storage';
import { buildRanking } from '../services/scoring';
import {
  apiFetch,
  readJsonOrEmpty,
  hasApiConfigured,
  getAuthToken,
  setAuthToken,
} from '../services/apiClient.js';
import { runLocalStorageMigrationOnce } from '../services/migrateStorage.js';

const OUTRA_ESCOLA_SUBTIPO_LABELS = {
  aluno: 'Aluno',
  professor: 'Professor(a)',
  funcionario: 'Funcionário(a)',
  visitante: 'Visitante',
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [stats, setStats] = useState({ userCount: 0, actionCount: 0 });
  const [loading, setLoading] = useState(true);

  const refreshLocal = useCallback(() => {
    const user = getCurrentUser();
    const allUsers = getAllUsers();
    const allLogs = getAllLogs();
    setCurrentUserState(user);
    setUsers(allUsers);
    setLogs(allLogs);
    setRanking(buildRanking());
    setStats({
      userCount: allUsers.length,
      actionCount: allLogs.length,
    });
  }, []);

  const refreshApi = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUserState(null);
      setUsers([]);
      setLogs([]);
      setRanking([]);
      setStats({ userCount: 0, actionCount: 0 });
      return;
    }

    const [meRes, rankRes, logsRes, stRes] = await Promise.all([
      apiFetch('/api/auth/me'),
      apiFetch('/api/ranking/global'),
      apiFetch('/api/users/me/actions'),
      apiFetch('/api/stats'),
    ]);

    if (!meRes.ok) {
      setAuthToken(null);
      setCurrentUserState(null);
      setUsers([]);
      setLogs([]);
      setRanking([]);
      setStats({ userCount: 0, actionCount: 0 });
      return;
    }

    const meData = await readJsonOrEmpty(meRes);
    const rankData = await readJsonOrEmpty(rankRes);
    const logsData = await readJsonOrEmpty(logsRes);
    const stData = await readJsonOrEmpty(stRes);

    setCurrentUserState(meData.user || null);
    const rk = rankData.ranking || [];
    setRanking(rk);
    setUsers(rk);
    setLogs(logsData.logs || []);
    setStats({
      userCount: stData.userCount ?? rk.length,
      actionCount: stData.actionCount ?? (logsData.logs || []).length,
    });
  }, []);

  const refresh = useCallback(async () => {
    if (hasApiConfigured()) {
      await refreshApi();
    } else {
      refreshLocal();
    }
  }, [refreshApi, refreshLocal]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        if (hasApiConfigured()) {
          const secret = import.meta.env.VITE_IMPORT_SECRET || '';
          await runLocalStorageMigrationOnce(secret);
          if (!cancelled) await refreshApi();
        } else {
          refreshLocal();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshApi, refreshLocal]);

  function registerUser(fields) {
    if (hasApiConfigured()) {
      return registerUserApi(fields);
    }
    return registerUserLocal(fields);
  }

  function registerUserLocal({
    name,
    email,
    password,
    participantType,
    classGroup,
    disciplina,
    cargo,
    funcao,
    escola,
    relacao,
    cidade,
    outraEscolaSubtipo,
  }) {
    const id = generateId();

    let displayGroup = classGroup?.trim() || '';

    if (participantType === 'outra_escola') {
      const st = outraEscolaSubtipo || '';
      if (st === 'aluno' || st === 'professor') {
        displayGroup = classGroup?.trim() || '';
      } else {
        displayGroup = '';
      }
    } else if (!displayGroup) {
      const fallbacks = {
        professor: disciplina?.trim() || 'Professor(a)',
        direcao: cargo?.trim() || 'Direção',
        administrativo: funcao?.trim() || 'Administrativo',
        visitante: relacao?.trim() || 'Visitante',
      };
      displayGroup = fallbacks[participantType] || participantType || '';
    }

    const subtipoLabel =
      participantType === 'outra_escola' && outraEscolaSubtipo
        ? OUTRA_ESCOLA_SUBTIPO_LABELS[outraEscolaSubtipo] || ''
        : '';

    const turmaValue =
      participantType === 'outra_escola' &&
      (outraEscolaSubtipo === 'aluno' || outraEscolaSubtipo === 'professor') &&
      classGroup?.trim()
        ? classGroup.trim()
        : '';

    const escolaFinal =
      participantType === 'aluno'
        ? 'Colégio Barro Vermelho'
        : escola?.trim() || '';

    const cidadeSigla = cidade?.nome ? gerarSiglaCidade(cidade.nome) : '';

    const user = {
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      participantType: participantType || '',
      classGroup: displayGroup,
      ...(cidade && { cidade: cidade.nome, codigoIbgeCidade: cidade.codigoIbge }),
      ...(cidadeSigla && { cidadeSigla }),
      ...(escolaFinal && { escola: escolaFinal }),
      ...(participantType === 'outra_escola' && subtipoLabel && { subtipo: subtipoLabel }),
      ...(turmaValue && { turma: turmaValue }),
      ...(disciplina && { disciplina: disciplina.trim() }),
      ...(cargo && { cargo: cargo.trim() }),
      ...(funcao && { funcao: funcao.trim() }),
      ...(relacao && { relacao: relacao.trim() }),
      createdAt: new Date().toISOString(),
    };
    saveUser(user);
    refreshLocal();
    return user;
  }

  async function registerUserApi(fields) {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: fields.name,
        email: fields.email,
        password: fields.password,
        participantType: fields.participantType,
        classGroup: fields.classGroup,
        disciplina: fields.disciplina,
        cargo: fields.cargo,
        funcao: fields.funcao,
        escola: fields.escola,
        relacao: fields.relacao,
        outraEscolaSubtipo: fields.outraEscolaSubtipo,
        cidade: fields.cidade,
      },
    });
    const data = await readJsonOrEmpty(res);
    if (!res.ok) {
      const err = new Error(data.error || 'register_failed');
      err.code = data.error;
      throw err;
    }
    setAuthToken(data.token);
    setCurrentUserState(data.user);
    await refreshApi();
    return data.user;
  }

  function loginUser(creds) {
    if (hasApiConfigured()) {
      return loginUserApi(creds);
    }
    const result = checkLogin(creds.email, creds.password);
    if (!result.ok) return result;
    persistUser(result.user);
    setCurrentUserState(result.user);
    refreshLocal();
    return result;
  }

  async function loginUserApi({ email, password }) {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    const data = await readJsonOrEmpty(res);
    if (!res.ok) {
      if (data.error === 'invalid_credentials') {
        return { ok: false, error: 'E-mail ou senha incorretos.' };
      }
      return { ok: false, error: 'Não foi possível entrar. Tente novamente.' };
    }
    setAuthToken(data.token);
    setCurrentUserState(data.user);
    await refreshApi();
    return { ok: true, user: data.user };
  }

  async function registerAction(action) {
    if (!currentUser) return;
    if (hasApiConfigured()) {
      const res = await apiFetch('/api/actions/register', {
        method: 'POST',
        body: { actionKey: action.id },
      });
      const data = await readJsonOrEmpty(res);
      if (!res.ok) return null;
      await refreshApi();
      return data.log;
    }
    const log = {
      id: generateId(),
      userId: currentUser.id,
      actionId: action.id,
      pointsEarned: action.points,
      createdAt: new Date().toISOString(),
    };
    addLog(log);
    refreshLocal();
    return log;
  }

  async function logout() {
    if (hasApiConfigured()) {
      setAuthToken(null);
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      await refreshApi();
    } else {
      clearCurrentUser();
      refreshLocal();
    }
  }

  async function resetDemo() {
    if (hasApiConfigured()) {
      setAuthToken(null);
      await refreshApi();
      return;
    }
    resetAllData();
    setCurrentUserState(null);
    refreshLocal();
  }

  function getTodayLogs() {
    if (!currentUser) return [];
    const today = new Date().toDateString();
    return logs.filter(
      (l) => l.userId === currentUser.id && new Date(l.createdAt).toDateString() === today
    );
  }

  function getUserLogs(userId) {
    return logs.filter((l) => l.userId === userId);
  }

  function getUserTotalPoints(userId) {
    return logs
      .filter((l) => l.userId === userId)
      .reduce((sum, l) => sum + l.pointsEarned, 0);
  }

  function currentUserTotalPoints() {
    if (!currentUser) return 0;
    if (hasApiConfigured()) {
      const r = ranking.find((u) => u.id === currentUser.id);
      if (r) return r.totalPoints ?? 0;
      return getUserTotalPoints(currentUser.id);
    }
    return getUserTotalPoints(currentUser.id);
  }

  function getActionById(actionId) {
    return ACTIONS_CATALOG.find((a) => a.id === actionId);
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        logs,
        ranking,
        stats,
        loading,
        registerUser,
        loginUser,
        registerAction,
        logout,
        resetDemo,
        refresh,
        getTodayLogs,
        getUserLogs,
        getUserTotalPoints,
        currentUserTotalPoints,
        getActionById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/* eslint-disable react-refresh/only-export-components -- hook exposto junto do Provider */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
