import { hashPassword, signToken, verifyPassword } from '../services/authService.js';
import { userRowToApi } from '../services/userMapper.js';

const VALID_ROLES = new Set(['user', 'admin']);

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function trimOrNull(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function parseUserId(raw) {
  const id = Number.parseInt(String(raw || ''), 10);
  return Number.isNaN(id) ? null : id;
}

function participantFilter(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `COALESCE(${prefix}role, 'user') <> 'admin'`;
}

function typeLabel(type) {
  const map = {
    aluno: 'Alunos',
    professor: 'Professores',
    direcao: 'Direcao',
    administrativo: 'Administrativo',
    outra_escola: 'Outras escolas',
    visitante: 'Visitantes',
    nao_informado: 'Nao informado',
  };
  return map[type] || type || 'Nao informado';
}

function categoryLabel(category) {
  const map = {
    agua: 'Agua',
    energia: 'Energia',
    residuos: 'Residuos',
    transporte: 'Transporte',
    alimentacao: 'Alimentacao',
    reutilizacao: 'Reutilizacao',
  };
  return map[category] || category || 'Sem categoria';
}

function mapChartRows(rows, formatter) {
  return rows.map((row) => ({
    label: formatter ? formatter(row.label) : row.label,
    value: Number(row.value || 0),
  }));
}

function getSummary(db) {
  const summary = db
    .prepare(
      `SELECT
         COUNT(*) AS totalUsers,
         COALESCE(SUM(pontos_totais), 0) AS totalPoints,
         SUM(CASE WHEN tipo = 'aluno' THEN 1 ELSE 0 END) AS studentCount,
         SUM(CASE WHEN tipo = 'professor' THEN 1 ELSE 0 END) AS teacherCount,
         SUM(CASE WHEN tipo = 'outra_escola' THEN 1 ELSE 0 END) AS otherSchoolCount
       FROM users
       WHERE ${participantFilter()}`
    )
    .get();

  const actions = db
    .prepare(
      `SELECT COUNT(*) AS totalActions
       FROM user_actions ua
       INNER JOIN users u ON u.id = ua.user_id
       WHERE ${participantFilter('u')}`
    )
    .get();

  return {
    totalUsers: Number(summary.totalUsers || 0),
    totalActions: Number(actions.totalActions || 0),
    totalPoints: Number(summary.totalPoints || 0),
    studentCount: Number(summary.studentCount || 0),
    teacherCount: Number(summary.teacherCount || 0),
    otherSchoolCount: Number(summary.otherSchoolCount || 0),
  };
}

function getTopUsers(db, limit = 5) {
  return db
    .prepare(
      `SELECT * FROM users
       WHERE ${participantFilter()}
       ORDER BY pontos_totais DESC, nome COLLATE NOCASE ASC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => userRowToApi(row));
}

function getTypeBreakdown(db) {
  const rows = db
    .prepare(
      `SELECT
         COALESCE(NULLIF(tipo, ''), 'nao_informado') AS label,
         COUNT(*) AS value
       FROM users
       WHERE ${participantFilter()}
       GROUP BY 1
       ORDER BY value DESC, label ASC`
    )
    .all();

  return mapChartRows(rows, typeLabel);
}

function getSchoolBreakdown(db) {
  const rows = db
    .prepare(
      `SELECT
         COALESCE(NULLIF(escola, ''), 'Nao informada') AS label,
         COUNT(*) AS value
       FROM users
       WHERE ${participantFilter()}
       GROUP BY 1
       ORDER BY value DESC, label ASC
       LIMIT 8`
    )
    .all();

  return mapChartRows(rows);
}

function getCityBreakdown(db) {
  const rows = db
    .prepare(
      `SELECT
         COALESCE(NULLIF(cidade, ''), 'Nao informada') AS label,
         COUNT(*) AS value
       FROM users
       WHERE ${participantFilter()}
       GROUP BY 1
       ORDER BY value DESC, label ASC
       LIMIT 8`
    )
    .all();

  return mapChartRows(rows);
}

function getScoreBreakdown(db) {
  const rows = db
    .prepare(
      `SELECT label, value
       FROM (
         SELECT
           CASE
             WHEN pontos_totais = 0 THEN '0'
             WHEN pontos_totais BETWEEN 1 AND 50 THEN '1-50'
             WHEN pontos_totais BETWEEN 51 AND 100 THEN '51-100'
             WHEN pontos_totais BETWEEN 101 AND 200 THEN '101-200'
             ELSE '200+'
           END AS label,
           COUNT(*) AS value,
           CASE
             WHEN pontos_totais = 0 THEN 1
             WHEN pontos_totais BETWEEN 1 AND 50 THEN 2
             WHEN pontos_totais BETWEEN 51 AND 100 THEN 3
             WHEN pontos_totais BETWEEN 101 AND 200 THEN 4
             ELSE 5
           END AS sort_key
         FROM users
         WHERE ${participantFilter()}
         GROUP BY label, sort_key
       )
       ORDER BY sort_key`
    )
    .all();

  return mapChartRows(rows);
}

function getActionCategoryBreakdown(db) {
  const rows = db
    .prepare(
      `SELECT
         ac.categoria AS label,
         COUNT(*) AS value
       FROM user_actions ua
       INNER JOIN actions_catalog ac ON ac.key = ua.action_key
       INNER JOIN users u ON u.id = ua.user_id
       WHERE ${participantFilter('u')}
       GROUP BY ac.categoria
       ORDER BY value DESC, label ASC`
    )
    .all();

  return mapChartRows(rows, categoryLabel);
}

function getRankingRows(db, filters = {}) {
  const clauses = [participantFilter()];
  const values = [];

  if (filters.search) {
    clauses.push('(LOWER(nome) LIKE ? OR LOWER(email) LIKE ?)');
    const like = `%${filters.search.toLowerCase()}%`;
    values.push(like, like);
  }

  if (filters.tipo) {
    clauses.push('tipo = ?');
    values.push(filters.tipo);
  }

  if (filters.cidade) {
    clauses.push('cidade = ?');
    values.push(filters.cidade);
  }

  if (filters.escola) {
    clauses.push('escola = ?');
    values.push(filters.escola);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db
    .prepare(
      `SELECT * FROM users
       ${whereSql}
       ORDER BY pontos_totais DESC, nome COLLATE NOCASE ASC`
    )
    .all(...values);
}

function getUsersList(db, search = '') {
  const clauses = [];
  const values = [];

  if (search) {
    clauses.push('(LOWER(nome) LIKE ? OR LOWER(email) LIKE ?)');
    const like = `%${search.toLowerCase()}%`;
    values.push(like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db
    .prepare(
      `SELECT * FROM users
       ${whereSql}
       ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, nome COLLATE NOCASE ASC`
    )
    .all(...values);
}

function buildUserPayload(existing, body) {
  const roleCandidate = body.role == null ? existing.role || 'user' : String(body.role).trim();
  const role = VALID_ROLES.has(roleCandidate) ? roleCandidate : null;
  if (!role) {
    const err = new Error('invalid_role');
    err.statusCode = 400;
    throw err;
  }

  const name =
    body.name === undefined ? existing.nome : String(body.name || '').trim();
  if (!name || name.length < 2) {
    const err = new Error('invalid_name');
    err.statusCode = 400;
    throw err;
  }

  const email =
    body.email === undefined ? existing.email : normalizeEmail(body.email);
  if (!validateEmail(email)) {
    const err = new Error('invalid_email');
    err.statusCode = 400;
    throw err;
  }

  const tipo = body.tipo === undefined ? existing.tipo : trimOrNull(body.tipo);
  const turma = body.turma === undefined ? existing.turma : trimOrNull(body.turma);
  const classGroup =
    body.classGroup !== undefined
      ? trimOrNull(body.classGroup)
      : tipo === 'aluno' || tipo === 'outra_escola'
        ? turma
        : existing.class_group;

  const payload = {
    nome: name,
    email,
    role,
    tipo,
    subtipo: body.subtipo === undefined ? existing.subtipo : trimOrNull(body.subtipo),
    escola: body.escola === undefined ? existing.escola : trimOrNull(body.escola),
    cidade: body.cidade === undefined ? existing.cidade : trimOrNull(body.cidade),
    cidade_sigla:
      body.cidadeSigla === undefined ? existing.cidade_sigla : trimOrNull(body.cidadeSigla),
    turma,
    class_group: classGroup,
    updated_at: new Date().toISOString(),
  };

  if (body.password !== undefined) {
    const password = String(body.password || '');
    if (password && password.length < 6) {
      const err = new Error('invalid_password');
      err.statusCode = 400;
      throw err;
    }
    payload.password_hash = password ? hashPassword(password) : existing.password_hash;
  } else {
    payload.password_hash = existing.password_hash;
  }

  return payload;
}

export function createAdminController(config, getDb) {
  const db = () => getDb(config);

  return {
    login(req, res) {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      if (!email || !password) {
        return res.status(400).json({ error: 'missing_credentials' });
      }

      const user = db().prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || user.role !== 'admin' || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }

      const token = signToken(config, user.id, user.email, user.role || 'admin');
      return res.json({ user: userRowToApi(user), token });
    },

    me(req, res) {
      const user = db().prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ error: 'unauthorized' });
      }

      return res.json({ user: userRowToApi(user) });
    },

    changePassword(req, res) {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'missing_password_fields' });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'invalid_password' });
      }

      const user = db().prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ error: 'unauthorized' });
      }
      if (!verifyPassword(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }

      db()
        .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .run(hashPassword(newPassword), new Date().toISOString(), req.userId);

      return res.status(204).send();
    },

    dashboard(_req, res) {
      const database = db();

      return res.json({
        summary: getSummary(database),
        topUsers: getTopUsers(database, 5),
        charts: {
          typeBreakdown: getTypeBreakdown(database),
          actionCategoryBreakdown: getActionCategoryBreakdown(database),
        },
      });
    },

    listUsers(req, res) {
      const rows = getUsersList(db(), String(req.query.search || '').trim());
      return res.json({ users: rows.map((row) => userRowToApi(row)) });
    },

    getUser(req, res) {
      const userId = parseUserId(req.params.id);
      if (!userId) {
        return res.status(400).json({ error: 'invalid_user_id' });
      }

      const user = db().prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      return res.json({ user: userRowToApi(user) });
    },

    updateUser(req, res) {
      const userId = parseUserId(req.params.id);
      if (!userId) {
        return res.status(400).json({ error: 'invalid_user_id' });
      }

      const existing = db().prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!existing) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      let payload;
      try {
        payload = buildUserPayload(existing, req.body || {});
      } catch (error) {
        return res.status(error.statusCode || 400).json({ error: error.message || 'invalid_payload' });
      }

      if (existing.id === req.userId && payload.role !== 'admin') {
        return res.status(400).json({ error: 'cannot_demote_self' });
      }

      try {
        db()
          .prepare(
            `UPDATE users
             SET nome = @nome,
                 email = @email,
                 password_hash = @password_hash,
                 role = @role,
                 tipo = @tipo,
                 subtipo = @subtipo,
                 escola = @escola,
                 cidade = @cidade,
                 cidade_sigla = @cidade_sigla,
                 turma = @turma,
                 class_group = @class_group,
                 updated_at = @updated_at
             WHERE id = @id`
          )
          .run({ ...payload, id: userId });
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) {
          return res.status(409).json({ error: 'email_in_use' });
        }
        return res.status(500).json({ error: 'server_error' });
      }

      const updated = db().prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return res.json({ user: userRowToApi(updated) });
    },

    deleteUser(req, res) {
      const userId = parseUserId(req.params.id);
      if (!userId) {
        return res.status(400).json({ error: 'invalid_user_id' });
      }
      if (userId === req.userId) {
        return res.status(400).json({ error: 'cannot_delete_self' });
      }

      const result = db().prepare('DELETE FROM users WHERE id = ?').run(userId);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      return res.status(204).send();
    },

    ranking(req, res) {
      const rows = getRankingRows(db(), {
        search: String(req.query.search || '').trim(),
        tipo: trimOrNull(req.query.tipo),
        cidade: trimOrNull(req.query.cidade),
        escola: trimOrNull(req.query.escola),
      });

      return res.json({ ranking: rows.map((row) => userRowToApi(row)) });
    },

    stats(_req, res) {
      const database = db();

      return res.json({
        typeBreakdown: getTypeBreakdown(database),
        schoolBreakdown: getSchoolBreakdown(database),
        cityBreakdown: getCityBreakdown(database),
        scoreBreakdown: getScoreBreakdown(database),
        actionCategoryBreakdown: getActionCategoryBreakdown(database),
      });
    },
  };
}
