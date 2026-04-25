import { API_BASE_URL, apiUrl } from '../config/api.js';
import { STORAGE_KEYS } from '../data/constants.js';

const API_TIMEOUT_MS = 15000;

export function hasApiConfigured() {
  return import.meta.env.PROD || Boolean(API_BASE_URL);
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
  const { timeoutMs = API_TIMEOUT_MS, ...fetchOptions } = options;
  const headers = {
    Accept: 'application/json',
    ...fetchOptions.headers,
  };

  const body = fetchOptions.body;
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

  const controller =
    !fetchOptions.signal && timeoutMs > 0 ? new AbortController() : null;
  const timeoutId = controller
    ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    return await fetch(apiUrl(path), {
      ...fetchOptions,
      headers,
      body: isJsonBody ? JSON.stringify(body) : body,
      signal: fetchOptions.signal ?? controller?.signal,
    });
  } finally {
    if (timeoutId) globalThis.clearTimeout(timeoutId);
  }
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
