import { userRowToApi } from '../services/userMapper.js';

export function createRankingController(config, getDb) {
  const db = () => getDb(config);

  return {
    global(req, res) {
      const rows = db()
        .prepare(
          `SELECT * FROM users
           ORDER BY pontos_totais DESC, id ASC`
        )
        .all();

      const ranking = rows.map((u) => ({
        ...userRowToApi(u),
        totalPoints: u.pontos_totais || 0,
      }));

      return res.json({ ranking });
    },

    /** Agregados para páginas como “Sobre” (público). */
    stats(_req, res) {
      const userCount = db()
        .prepare('SELECT COUNT(*) AS n FROM users')
        .get().n;
      const actionCount = db()
        .prepare('SELECT COUNT(*) AS n FROM user_actions')
        .get().n;
      return res.json({ userCount, actionCount });
    },
  };
}
