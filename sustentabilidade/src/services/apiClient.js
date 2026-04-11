import { API_BASE_URL, apiUrl } from '../config/api.js';
import { STORAGE_KEYS } from '../data/constants.js';

export function hasApiConfigured() {
  return Boolean(API_BASE_URL);
}

export function getAuthToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  } catch {
    console.error('Erro ao gravar token.');
  }
}

/**
 * fetch com JSON, Authorization e tratamento básico de erros.
 */
export async function apiFetch(path, options = {}) {
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

  const t = getAuthToken();
  if (t) {
    headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    body: isJsonBody ? JSON.stringify(body) : body,
  });

  return res;
}

export async function readJsonOrEmpty(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
