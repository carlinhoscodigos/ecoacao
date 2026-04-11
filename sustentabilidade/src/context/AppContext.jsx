import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ACTIONS_CATALOG } from '../data/actions';
import { generateId, gerarSiglaCidade } from '../utils/helpers';
import { checkLogin } from '../utils/auth';
import {
  getAllUsers,
  saveUser,
  addLog,
  getAllLogs,
  getCurrentUser,
  setCurrentUser as persistUser,
  clearCurrentUser,
} from '../services/storage';
import { buildRanking } from '../services/scoring';
import { getUserInsights } from '../services/gamification.js';
import { getNewlyUnlockedAchievements } from '../services/achievements.js';
import {
  apiFetch,
  readJsonOrEmpty,
  hasApiConfigured,
  getAuthToken,
  setAuthToken,
} from '../services/apiClient.js';
import { runLocalStorageMigrationOnce } from '../services/migrateStorage.js';
import { ESCOLA_PRINCIPAL_NOME, CIDADE_ESCOLA_PRINCIPAL } from '../data/constants.js';

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

    const escolaPrincipal =
      participantType !== 'outra_escola' ? ESCOLA_PRINCIPAL_NOME : escola?.trim() || '';

    const cidadeRef =
      participantType !== 'outra_escola' ? CIDADE_ESCOLA_PRINCIPAL : cidade;

    const cidadeSigla = cidadeRef?.nome ? gerarSiglaCidade(cidadeRef.nome) : '';

    const user = {
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      participantType: participantType || '',
      classGroup: displayGroup,
      ...(cidadeRef && {
        cidade: cidadeRef.nome,
        codigoIbgeCidade: cidadeRef.codigoIbge,
      }),
      ...(cidadeSigla && { cidadeSigla }),
      ...(escolaPrincipal && { escola: escolaPrincipal }),
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
    const previousLogs = getUserLogs(currentUser.id);
    const previousRanking = [...ranking];
    const previousTotalPoints = currentUserTotalPoints();
    const previousInsights = getUserInsights(previousLogs);
    if (hasApiConfigured()) {
      const res = await apiFetch('/api/actions/register', {
        method: 'POST',
        body: { actionKey: action.id },
      });
      const data = await readJsonOrEmpty(res);
      if (!res.ok) return null;
      const nextLogs = [...previousLogs, data.log];
      const nextInsights = getUserInsights(nextLogs);
      await refreshApi();
      const nextRanking = await fetchRankingSnapshot();
      return buildActionFeedback({
        log: data.log,
        action,
        previousRanking,
        nextRanking,
        currentUserId: currentUser.id,
        previousTotalPoints,
        previousInsights,
        nextInsights,
      });
    }
    const log = {
      id: generateId(),
      userId: currentUser.id,
      actionId: action.id,
      pointsEarned: action.points,
      createdAt: new Date().toISOString(),
    };
    const nextLogs = [...previousLogs, log];
    const nextInsights = getUserInsights(nextLogs);
    addLog(log);
    refreshLocal();
    const nextRanking = buildRanking();
    return buildActionFeedback({
      log,
      action,
      previousRanking,
      nextRanking,
      currentUserId: currentUser.id,
      previousTotalPoints,
      previousInsights,
      nextInsights,
    });
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

  function getCurrentUserInsights() {
    if (!currentUser) {
      return getUserInsights([]);
    }
    return getUserInsights(getUserLogs(currentUser.id));
  }

  async function fetchRankingSnapshot() {
    if (!hasApiConfigured()) {
      return buildRanking();
    }

    const rankRes = await apiFetch('/api/ranking/global');
    const rankData = await readJsonOrEmpty(rankRes);
    return rankData.ranking || [];
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
        refresh,
        getTodayLogs,
        getUserLogs,
        getUserTotalPoints,
        currentUserTotalPoints,
        getActionById,
        getCurrentUserInsights,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function buildActionFeedback({
  log,
  action,
  previousRanking,
  nextRanking,
  currentUserId,
  previousTotalPoints,
  previousInsights,
  nextInsights,
}) {
  const previousPosition = previousRanking.findIndex((u) => u.id === currentUserId);
  const nextPosition = nextRanking.findIndex((u) => u.id === currentUserId);
  const nextEntry = nextRanking.find((u) => u.id === currentUserId);
  const unlockedAchievements = getNewlyUnlockedAchievements(
    previousInsights?.achievements || [],
    nextInsights?.achievements || []
  );
  const streakIncreased =
    (nextInsights?.currentStreak || 0) > (previousInsights?.currentStreak || 0);

  return {
    log,
    actionId: action.id,
    pointsEarned: action.points,
    previousPosition: previousPosition >= 0 ? previousPosition + 1 : null,
    newPosition: nextPosition >= 0 ? nextPosition + 1 : null,
    positionGain:
      previousPosition >= 0 && nextPosition >= 0
        ? Math.max(0, previousPosition - nextPosition)
        : 0,
    previousTotalPoints,
    newTotalPoints: nextEntry?.totalPoints ?? previousTotalPoints + action.points,
    currentStreak: nextInsights?.currentStreak || 0,
    streakIncreased,
    unlockedAchievements,
  };
}

/* eslint-disable react-refresh/only-export-components -- hook exposto junto do Provider */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
