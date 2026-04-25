import { buildUserInsertPayload, signToken, verifyPassword } from '../services/authService.js';
import { userRowToApi } from '../services/userMapper.js';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function createAuthController(config, getDb) {
  const db = () => getDb(config);

  return {
    checkEmail(req, res) {
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'invalid_email' });
      }
      const row = db()
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(email);
      return res.json({ available: !row });
    },

    register(req, res) {
      const body = req.body || {};
      const password = body.password;

      if (!body.name?.trim() || body.name.trim().length < 2) {
        return res.status(400).json({ error: 'invalid_name' });
      }
      if (!validateEmail(body.email)) {
        return res.status(400).json({ error: 'invalid_email' });
      }
      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: 'invalid_password' });
      }
      if (!body.participantType) {
        return res.status(400).json({ error: 'missing_participant_type' });
      }
      if (!body.cidade?.nome?.trim()) {
        return res.status(400).json({ error: 'missing_cidade' });
      }

      let payload;
      try {
        payload = buildUserInsertPayload(body);
      } catch (e) {
        console.error('[auth] register build payload:', e);
        return res.status(400).json({ error: 'invalid_payload' });
      }

      try {
        const result = db()
          .prepare(
            `INSERT INTO users (
              nome, email, password_hash, tipo, subtipo, escola, cidade, codigo_ibge_cidade,
              cidade_sigla, turma, class_group, disciplina, cargo, funcao, relacao,
              created_at, updated_at
            ) VALUES (
              @nome, @email, @password_hash, @tipo, @subtipo, @escola, @cidade, @codigo_ibge_cidade,
              @cidade_sigla, @turma, @class_group, @disciplina, @cargo, @funcao, @relacao,
              @created_at, @updated_at
            )`
          )
          .run(payload);

        const user = db()
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(result.lastInsertRowid);

        const apiUser = userRowToApi(user);
        const token = signToken(config, user.id, user.email, user.role || 'user');
        console.log(`[auth] registo ok: id=${user.id} email=${user.email}`);
        return res.status(201).json({ user: apiUser, token });
      } catch (e) {
        if (String(e.message).includes('UNIQUE')) {
          return res.status(409).json({ error: 'email_in_use' });
        }
        console.error('[auth] register:', e);
        return res.status(500).json({ error: 'server_error' });
      }
    },

    login(req, res) {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const password = req.body?.password;
      if (!email || !password) {
        return res.status(400).json({ error: 'missing_credentials' });
      }

      const user = db().prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      if (user.role === 'admin') {
        return res.status(403).json({ error: 'admin_use_admin_login' });
      }

      const apiUser = userRowToApi(user);
      const token = signToken(config, user.id, user.email, user.role || 'user');
      console.log(`[auth] login ok: id=${user.id} email=${user.email}`);
      return res.json({ user: apiUser, token });
    },

    me(req, res) {
      const userId = req.userId;
      const user = db().prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      return res.json({ user: userRowToApi(user) });
    },

    logout(_req, res) {
      return res.status(204).send();
    },
  };
}
