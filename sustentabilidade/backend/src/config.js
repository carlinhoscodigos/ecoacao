/**
 * Normaliza URL de origem (trim, sem barra final — o header Origin nunca traz barra).
 */
export function normalizeOriginUrl(url) {
  if (url == null || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  return t.replace(/\/+$/, '');
}

/**
 * Lista de origens permitidas para CORS (valores vazios ignorados).
 */
export function buildAllowedOrigins(dev, prod) {
  const list = [normalizeOriginUrl(dev), normalizeOriginUrl(prod)].filter(Boolean);
  return [...new Set(list)];
}

/**
 * Carrega e valida variáveis de ambiente com defaults seguros.
 */
export function loadConfig() {
  const rawPort = process.env.PORT ?? '3000';
  const PORT = Number.parseInt(String(rawPort), 10);

  if (Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(
      `PORT inválido: "${rawPort}". Use um número entre 1 e 65535.`
    );
  }

  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';

  let FRONTEND_URL_DEV = normalizeOriginUrl(process.env.FRONTEND_URL_DEV);
  if (!FRONTEND_URL_DEV && !isProduction) {
    FRONTEND_URL_DEV = 'http://localhost:5173';
  }

  // Produção no Vercel; FRONTEND_URL mantém compatibilidade com .env antigo
  const FRONTEND_URL_PROD =
    normalizeOriginUrl(process.env.FRONTEND_URL_PROD) ||
    normalizeOriginUrl(process.env.FRONTEND_URL);

  const allowedOrigins = buildAllowedOrigins(FRONTEND_URL_DEV, FRONTEND_URL_PROD);

  return {
    PORT,
    FRONTEND_URL_DEV,
    FRONTEND_URL_PROD,
    NODE_ENV,
    isProduction,
    allowedOrigins,
  };
}
