import { importLocalStorageSnapshot } from '../services/migrationService.js';

export function createMigrationController(config, getDb) {
  return {
    importLocalStorage(req, res) {
      const secret = req.headers['x-import-secret'];
      if (config.importSecret) {
        if (!secret || secret !== config.importSecret) {
          console.warn('[migration] tentativa bloqueada: segredo inválido ou ausente');
          return res.status(403).json({ error: 'forbidden' });
        }
      } else if (config.isProduction) {
        console.warn('[migration] IMPORT_SECRET não definido — importação desativada em produção');
        return res.status(503).json({ error: 'migration_disabled' });
      }

      const body = req.body || {};
      try {
        const result = importLocalStorageSnapshot(config, getDb, {
          users: body.users,
          actionLogs: body.actionLogs,
          currentUserEmail: body.currentUserEmail,
        });
        console.log(
          `[migration] users=${result.usersImported} logs=${result.logsImported} skipped=${result.logsSkipped}`
        );
        return res.status(200).json({
          ok: true,
          usersImported: result.usersImported,
          logsImported: result.logsImported,
          logsSkipped: result.logsSkipped,
          ...(result.token && result.user
            ? { token: result.token, user: result.user }
            : {}),
        });
      } catch (e) {
        console.error('[migration]', e);
        return res.status(500).json({ error: 'import_failed' });
      }
    },
  };
}
