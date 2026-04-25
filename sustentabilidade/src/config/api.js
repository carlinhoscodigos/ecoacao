/**
 * Em producao, a API usa o mesmo dominio do site e a Vercel faz proxy de /api
 * para o backend Tailscale. Isso evita o aviso de acesso a rede local do browser.
 * Em dev, VITE_API_URL ainda pode apontar diretamente para o backend.
 */
export const IS_PRODUCTION = import.meta.env.PROD;
export const API_URL = IS_PRODUCTION
  ? ''
  : String(import.meta.env.VITE_API_URL ?? '').trim();
export const API_BASE_URL = API_URL.replace(/\/$/, '');

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
