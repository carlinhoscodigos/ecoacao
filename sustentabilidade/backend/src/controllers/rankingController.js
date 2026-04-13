import { userRowToApi } from '../services/userMapper.js';

export function createRankingController(config, getDb) {
  const db = () => getDb(config);
  const participantFilter = "COALESCE(role, 'user') <> 'admin'";
  const effectivePointsSql = 'COALESCE(pontos_totais, 0) + COALESCE(pontos_ajuste, 0)';

  return {
    global(req, res) {
      const rows = db()
        .prepare(
          `SELECT * FROM users
           WHERE ${participantFilter}
           ORDER BY ${effectivePointsSql} DESC, id ASC`
        )
        .all();

      const ranking = rows.map((u) => userRowToApi(u));

      return res.json({ ranking });
    },

    /** Agregados para páginas como “Sobre” (público). */
    stats(_req, res) {
      const userCount = db()
        .prepare(`SELECT COUNT(*) AS n FROM users WHERE ${participantFilter}`)
        .get().n;
      const actionCount = db()
        .prepare(
          `SELECT COUNT(*) AS n
           FROM user_actions ua
           INNER JOIN users u ON u.id = ua.user_id
           WHERE COALESCE(u.role, 'user') <> 'admin'`
        )
        .get().n;
      return res.json({ userCount, actionCount });
    },
  };
}
