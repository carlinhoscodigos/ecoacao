import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getCurrentUser,
  setCurrentUser as persistUser,
  getAllUsers,
  saveUser,
  addLog,
  getAllLogs,
  resetAllData,
  clearCurrentUser,
} from '../services/storage';
import { buildRanking } from '../services/scoring';
import { generateId, gerarSiglaCidade } from '../utils/helpers';
import { ACTIONS_CATALOG } from '../data/actions';
import { checkLogin } from '../utils/auth';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const user = getCurrentUser();
    const allUsers = getAllUsers();
    const allLogs = getAllLogs();
    setCurrentUserState(user);
    setUsers(allUsers);
    setLogs(allLogs);
    setRanking(buildRanking());
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  function registerUser({ name, email, password, participantType, classGroup, disciplina, cargo, funcao, escola, relacao, cidade }) {
    const id = generateId();

    // classGroup é usado no ranking como info de contexto do usuário
    let displayGroup = classGroup?.trim() || '';
    if (!displayGroup) {
      const fallbacks = {
        professor:      disciplina?.trim() || 'Professor(a)',
        direcao:        cargo?.trim()      || 'Direção',
        administrativo: funcao?.trim()     || 'Administrativo',
        outra_escola:   escola?.trim()     || 'Outra escola',
        visitante:      relacao?.trim()    || 'Visitante',
      };
      displayGroup = fallbacks[participantType] || participantType || '';
    }

    // cidadeSigla gerada automaticamente
    const cidadeSigla = cidade?.nome
      ? gerarSiglaCidade(cidade.nome)
      : '';

    const user = {
      id,
      name:            name.trim(),
      email:           email.trim().toLowerCase(),
      password,
      participantType: participantType || '',
      classGroup:      displayGroup,
      ...(cidade        && { cidade: cidade.nome, codigoIbgeCidade: cidade.codigoIbge }),
      ...(cidadeSigla   && { cidadeSigla }),
      ...(escola        && { escola:      escola.trim()      }),
      ...(disciplina    && { disciplina:  disciplina.trim()  }),
      ...(cargo         && { cargo:       cargo.trim()       }),
      ...(funcao        && { funcao:      funcao.trim()      }),
      ...(relacao       && { relacao:     relacao.trim()     }),
      createdAt: new Date().toISOString(),
    };
    saveUser(user);
    refresh();
    return user;
  }

  function loginUser({ email, password }) {
    const result = checkLogin(email, password);
    if (!result.ok) return result;
    persistUser(result.user);
    setCurrentUserState(result.user);
    refresh();
    return result;
  }

  function registerAction(action) {
    if (!currentUser) return;
    const log = {
      id: generateId(),
      userId: currentUser.id,
      actionId: action.id,
      pointsEarned: action.points,
      createdAt: new Date().toISOString(),
    };
    addLog(log);
    refresh();
    return log;
  }

  function logout() {
    clearCurrentUser();
    setCurrentUserState(null);
    refresh();
  }

  function resetDemo() {
    resetAllData();
    setCurrentUserState(null);
    refresh();
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

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
