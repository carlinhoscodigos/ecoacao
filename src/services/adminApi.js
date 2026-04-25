import { apiUrl } from '../config/api.js';
import { STORAGE_KEYS } from '../data/constants.js';
import { hasApiConfigured, readJsonOrEmpty } from './apiClient.js';

export function getAdminToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH_TOKEN);
    }
  } catch {
    console.error('Erro ao gravar token admin.');
  }
}

export async function adminFetch(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  const body = options.body;
  const isJsonBody =
    body != null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof Blob);

  if (isJsonBody) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
    body: isJsonBody ? JSON.stringify(body) : body,
  });
}

export { hasApiConfigured, readJsonOrEmpty };
