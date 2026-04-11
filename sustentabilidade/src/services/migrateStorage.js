import { STORAGE_KEYS } from '../data/constants.js';
import { apiFetch, readJsonOrEmpty, setAuthToken } from './apiClient.js';

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasLegacyLocalStorageData() {
  const users = load(STORAGE_KEYS.USERS);
  const logs = load(STORAGE_KEYS.ACTION_LOGS);
  return (
    (Array.isArray(users) && users.length > 0) ||
    (Array.isArray(logs) && logs.length > 0)
  );
}

export function readLocalStorageSnapshot() {
  const users = load(STORAGE_KEYS.USERS) || [];
  const actionLogs = load(STORAGE_KEYS.ACTION_LOGS) || [];
  const cur = load(STORAGE_KEYS.CURRENT_USER);
  return {
    users,
    actionLogs,
    currentUserEmail: cur?.email || null,
  };
}

/**
 * Migração única para o backend. Requer VITE_IMPORT_SECRET igual ao IMPORT_SECRET do servidor.
 */
export async function runLocalStorageMigrationOnce(importSecret) {
  const done = localStorage.getItem(STORAGE_KEYS.MIGRATION_V1_DONE);
  if (done === '1') return { skipped: true };

  if (!hasLegacyLocalStorageData()) {
    localStorage.setItem(STORAGE_KEYS.MIGRATION_V1_DONE, '1');
    return { skipped: true, empty: true };
  }

  const snapshot = readLocalStorageSnapshot();
  const headers = { 'X-Import-Secret': importSecret || '' };

  const res = await apiFetch('/api/migration/import-localstorage', {
    method: 'POST',
    headers,
    body: snapshot,
  });

  const data = await readJsonOrEmpty(res);

  if (!res.ok) {
    console.warn('[migration] falha:', res.status, data);
    return { ok: false, status: res.status, data };
  }

  localStorage.setItem(STORAGE_KEYS.MIGRATION_V1_DONE, '1');

  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.ACTION_LOGS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

  if (data.token && data.user) {
    setAuthToken(data.token);
  }

  return { ok: true, data };
}
