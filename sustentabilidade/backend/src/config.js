import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const defaultDbPath = path.join(__dirname, '..', 'data', 'ecoacao.db');
  const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : defaultDbPath;

  let jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET é obrigatório em produção.');
    }
    jwtSecret = 'dev-only-change-me';
    console.warn(
      '[config] JWT_SECRET não definido — a usar valor inseguro só para desenvolvimento.'
    );
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const importSecret = process.env.IMPORT_SECRET?.trim() || '';

  return {
    PORT,
    FRONTEND_URL_DEV,
    FRONTEND_URL_PROD,
    NODE_ENV,
    isProduction,
    allowedOrigins,
    databasePath,
    jwtSecret,
    jwtExpiresIn,
    importSecret,
  };
}
