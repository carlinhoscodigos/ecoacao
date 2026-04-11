import express from 'express';
import cors from 'cors';

export function createApp(config) {
  const app = express();

  // Cloudflare Tunnel / proxy: IP e protocolo corretos nos logs
  app.set('trust proxy', 1);

  app.use(express.json());

  const allowedOrigins = config.allowedOrigins ?? [];

  app.use(
    cors({
      origin(origin, callback) {
        // Sem header Origin: browser same-origin, curl, healthchecks, proxies
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

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

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
