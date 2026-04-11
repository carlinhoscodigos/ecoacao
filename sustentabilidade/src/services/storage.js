import { STORAGE_KEYS } from '../data/constants';

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Erro ao salvar no LocalStorage:', key);
  }
}

// ─── Usuários ──────────────────────────────────────────────────────────────

export function getAllUsers() {
  return load(STORAGE_KEYS.USERS) || [];
}

export function saveUser(user) {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  save(STORAGE_KEYS.USERS, users);
}

export function findUserByEmail(email) {
  return getAllUsers().find(
    (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

export function getCurrentUser() {
  return load(STORAGE_KEYS.CURRENT_USER) || null;
}

export function setCurrentUser(user) {
  save(STORAGE_KEYS.CURRENT_USER, user);
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// ─── Registros de ações ────────────────────────────────────────────────────

export function getAllLogs() {
  return load(STORAGE_KEYS.ACTION_LOGS) || [];
}

export function addLog(log) {
  const logs = getAllLogs();
  logs.push(log);
  save(STORAGE_KEYS.ACTION_LOGS, logs);
}

export function getLogsByUser(userId) {
  return getAllLogs().filter((l) => l.userId === userId);
}

export function getLogsByUserToday(userId) {
  const today = new Date().toDateString();
  return getLogsByUser(userId).filter(
    (l) => new Date(l.createdAt).toDateString() === today
  );
}

// ─── Reset para demonstração ───────────────────────────────────────────────

export function resetAllData() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export function resetCurrentUser() {
  clearCurrentUser();
}
