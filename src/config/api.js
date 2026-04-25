/**
 * Base URL da API. Defina VITE_API_URL no Vercel (Production) ou em .env.local (dev).
 * O Vite só expõe variáveis com prefixo VITE_.
 */
export const API_URL = String(import.meta.env.VITE_API_URL ?? '').trim();
export const API_BASE_URL = API_URL.replace(/\/$/, '');
export const IS_PRODUCTION = import.meta.env.PROD;

function assertProductionApiConfigured() {
  if (!API_BASE_URL && IS_PRODUCTION) {
    throw new Error('VITE_API_URL precisa estar definido na build de producao.');
  }
}

/**
 * Monta URL absoluta para um path da API (ex.: "/api/health").
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    assertProductionApiConfigured();
    return p;
  }
  return `${API_BASE_URL}${p}`;
}

/** fetch para o backend usando a base configurada (preferir isto a fetch manual). */
export function apiFetch(path, init) {
  return fetch(apiUrl(path), init);
}
