/**
 * Base URL da API (Tailscale Funnel, localhost, etc.).
 * Defina VITE_API_URL no .env ou .env.local (sem barra no final).
 */
const raw = import.meta.env.VITE_API_URL ?? '';

export const API_BASE_URL = String(raw).replace(/\/$/, '');

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
