import { actionLogRowToApi } from '../services/userMapper.js';

export function createActionsController(config, getDb) {
  const db = () => getDb(config);

  return {
    listCatalog(_req, res) {
      const rows = db()
        .prepare(
          'SELECT key, nome AS title, categoria AS category, pontos AS points, icon, color, descricao AS description FROM actions_catalog ORDER BY id'
        )
        .all();
      const mapped = rows.map((r) => ({
        id: r.key,
        title: r.title,
        category: r.category,
        points: r.points,
        icon: r.icon,
        color: r.color,
        description: r.description || '',
      }));
      return res.json({ actions: mapped });
    },

    registerAction(req, res) {
      const userId = req.userId;
      const actionKey =
        req.body?.actionKey || req.body?.actionId || req.body?.id;
      if (!actionKey || typeof actionKey !== 'string') {
        return res.status(400).json({ error: 'missing_action_key' });
      }

      const catalog = db()
        .prepare('SELECT pontos FROM actions_catalog WHERE key = ?')
        .get(actionKey);
      if (!catalog) {
        return res.status(400).json({ error: 'unknown_action' });
      }

      const now = new Date().toISOString();
      const actionDate = now.slice(0, 10);

      const ins = db()
        .prepare(
          `INSERT INTO user_actions (user_id, action_key, pontos, action_date, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(userId, actionKey, catalog.pontos, actionDate, now);

      const row = db()
        .prepare('SELECT * FROM user_actions WHERE id = ?')
        .get(ins.lastInsertRowid);

      const log = actionLogRowToApi(row, userId);
      console.log(
        `[actions] user=${userId} action=${actionKey} +${catalog.pontos} pts`
      );
      return res.status(201).json({ log });
    },

    myActions(req, res) {
      const userId = req.userId;
      const rows = db()
        .prepare(
          'SELECT * FROM user_actions WHERE user_id = ? ORDER BY created_at ASC'
        )
        .all(userId);

      const logs = rows.map((r) => actionLogRowToApi(r, userId));
      return res.json({ logs });
    },
  };
}
