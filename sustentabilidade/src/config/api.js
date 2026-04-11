/**
 * Base URL da API. Defina VITE_API_URL no Vercel (Production) ou em .env.local (dev).
 * O Vite só expõe variáveis com prefixo VITE_.
 */
export const API_URL = import.meta.env.VITE_API_URL;

export const API_BASE_URL = String(API_URL ?? '').replace(/\/$/, '');

/**
 * Monta URL absoluta para um path da API (ex.: "/api/health").
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return p;
  }
  return `${API_BASE_URL}${p}`;
}

/** fetch para o backend usando a base configurada (preferir isto a fetch manual). */
export function apiFetch(path, init) {
  return fetch(apiUrl(path), init);
}
