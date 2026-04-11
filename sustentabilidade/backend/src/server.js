import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { getDb } from './db/db.js';

// Carrega backend/.env sempre a partir deste arquivo (não depende do cwd).
// Assim `node src/server.js` funciona mesmo quando o cwd não é a pasta backend.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let config;
try {
  config = loadConfig();
} catch (e) {
  console.error('[server] Falha ao carregar configuração:', e.message);
  process.exit(1);
}

const {
  PORT,
  FRONTEND_URL_DEV,
  FRONTEND_URL_PROD,
  NODE_ENV,
  isProduction,
} = config;

if (!FRONTEND_URL_PROD && isProduction) {
  console.warn(
    '[server] Aviso: FRONTEND_URL_PROD não definido. O site no Vercel pode ser bloqueado pelo CORS até configurar.'
  );
}

if (!FRONTEND_URL_DEV && isProduction) {
  console.warn(
    '[server] Aviso: FRONTEND_URL_DEV não definido. Chamadas de localhost:5173 não serão aceites pelo CORS.'
  );
}

try {
  getDb(config);
  console.log(`[server] SQLite: ${config.databasePath}`);
} catch (e) {
  console.error('[server] Falha ao inicializar base de dados:', e.message);
  process.exit(1);
}

const app = createApp(config);

const host = '0.0.0.0';

const httpServer = app.listen(PORT, host, () => {
  console.log('');
  console.log('[server] Sustentabilidade API');
  console.log(`[server] NODE_ENV=${NODE_ENV}`);
  console.log(`[server] Escutando em http://${host}:${PORT}`);
  console.log(`[server] Teste no browser: http://127.0.0.1:${PORT}/api/health`);
  console.log(
    `[server] Nota: o frontend Vite (raiz do projeto) usa a porta 5173; esta API usa ${PORT}.`
  );
  if (FRONTEND_URL_PROD) {
    console.log(`[server] CORS Vercel: ${FRONTEND_URL_PROD}`);
  }
  if (FRONTEND_URL_DEV) {
    console.log(`[server] CORS dev: ${FRONTEND_URL_DEV}`);
  }
  console.log('');
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[server] Porta ${PORT} já está em uso. Feche o outro processo ou altere PORT no backend/.env.`
    );
  } else {
    console.error('[server] Falha ao iniciar o servidor:', err.message);
  }
  process.exit(1);
});
