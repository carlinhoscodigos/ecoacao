import express from 'express';
import cors from 'cors';
import { getDb } from './db/db.js';
import { createAuthController } from './controllers/authController.js';
import { createActionsController } from './controllers/actionsController.js';
import { createRankingController } from './controllers/rankingController.js';
import { createMigrationController } from './controllers/migrationController.js';
import { createAuthMiddleware } from './middleware/authMiddleware.js';

export function createApp(config) {
  const app = express();

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '2mb' }));

  const allowedOrigins = config.allowedOrigins ?? [];

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.length === 0) {
          return callback(
            new Error(
              'CORS: defina FRONTEND_URL_DEV e/ou FRONTEND_URL_PROD no .env'
            )
          );
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS: origem não permitida: ${origin}`));
      },
      credentials: true,
    })
  );

  const getDbBound = () => getDb(config);

  const auth = createAuthController(config, getDbBound);
  const authMw = createAuthMiddleware(config);
  const actions = createActionsController(config, getDbBound);
  const ranking = createRankingController(config, getDbBound);
  const migration = createMigrationController(config, getDbBound);

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/auth/check-email', auth.checkEmail);
  app.post('/api/auth/register', auth.register);
  app.post('/api/auth/login', auth.login);
  app.get('/api/auth/me', authMw, auth.me);
  app.post('/api/auth/logout', authMw, auth.logout);

  app.get('/api/actions', actions.listCatalog);
  app.post('/api/actions/register', authMw, actions.registerAction);
  app.get('/api/users/me/actions', authMw, actions.myActions);

  app.get('/api/ranking/global', ranking.global);
  app.get('/api/stats', ranking.stats);

  app.post('/api/migration/import-localstorage', migration.importLocalStorage);

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', path: req.path });
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    const isCors = err.message?.startsWith('CORS:');
    const code = isCors ? 403 : status >= 400 && status < 600 ? status : 500;

    const body = {
      error: isCors ? 'cors_forbidden' : 'internal_error',
    };
    if (!config.isProduction && err.message) {
      body.message = err.message;
    }

    res.status(code).json(body);
  });

  return app;
}
