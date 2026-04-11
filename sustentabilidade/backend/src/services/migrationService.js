import crypto from 'node:crypto';
import { hashPassword } from './authService.js';
import { buildUserInsertPayload } from './authService.js';
import { signToken } from './authService.js';
import { userRowToApi } from './userMapper.js';

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/**
 * Importa utilizadores e logs no formato do localStorage.
 * @returns {{ usersImported: number, logsImported: number, logsSkipped: number, token?: string, user?: object }}
 */
export function importLocalStorageSnapshot(config, getDb, payload) {
  const db = getDb(config);
  const usersIn = Array.isArray(payload.users) ? payload.users : [];
  const logsIn = Array.isArray(payload.actionLogs) ? payload.actionLogs : [];
  const currentUserEmail = payload.currentUserEmail
    ? normalizeEmail(payload.currentUserEmail)
    : null;

  const idMap = new Map();
  let usersImported = 0;
  let logsImported = 0;
  let logsSkipped = 0;

  const insertUser = db.prepare(`
    INSERT INTO users (
      legacy_user_id, nome, email, password_hash, tipo, subtipo, escola, cidade, codigo_ibge_cidade,
      cidade_sigla, turma, class_group, disciplina, cargo, funcao, relacao,
      created_at, updated_at
    ) VALUES (
      @legacy_user_id, @nome, @email, @password_hash, @tipo, @subtipo, @escola, @cidade, @codigo_ibge_cidade,
      @cidade_sigla, @turma, @class_group, @disciplina, @cargo, @funcao, @relacao,
      @created_at, @updated_at
    )
  `);

  const updateLegacy = db.prepare(
    'UPDATE users SET legacy_user_id = COALESCE(legacy_user_id, ?), updated_at = ? WHERE id = ?'
  );

  const txn = db.transaction(() => {
    for (const raw of usersIn) {
      let email = normalizeEmail(raw.email);
      if ((!email || !email.includes('@')) && raw.id != null) {
        const lid = String(raw.id);
        if (lid.startsWith('demo-')) {
          email = `${lid.replace(/[^a-z0-9-]/gi, '')}@ecoacao.imported.local`;
        }
      }
      if (!email || !email.includes('@')) continue;

      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      const legacyId = raw.id != null ? String(raw.id) : null;

      if (existing) {
        if (legacyId && !existing.legacy_user_id) {
          updateLegacy.run(legacyId, new Date().toISOString(), existing.id);
        }
        idMap.set(String(raw.id ?? email), existing.id);
        continue;
      }

      let rowPayload;
      try {
        rowPayload = localStorageUserToInsert(raw, email);
      } catch {
        continue;
      }

      const r = insertUser.run(rowPayload);
      idMap.set(String(raw.id ?? email), Number(r.lastInsertRowid));
      usersImported += 1;
    }

    const insertLog = db.prepare(`
      INSERT OR IGNORE INTO user_actions (user_id, action_key, pontos, action_date, legacy_log_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const catalogKeys = new Set(
      db.prepare('SELECT key FROM actions_catalog').all().map((x) => x.key)
    );

    for (const log of logsIn) {
      const legacyUserId = log.userId != null ? String(log.userId) : null;
      const uid = idMap.get(legacyUserId);
      if (uid == null) {
        logsSkipped += 1;
        continue;
      }

      const actionKey = log.actionId || log.action_key;
      if (!actionKey || !catalogKeys.has(actionKey)) {
        logsSkipped += 1;
        continue;
      }

      const pontos = Number(log.pointsEarned ?? log.pontos ?? 0);
      const createdAt = log.createdAt || new Date().toISOString();
      const actionDate = String(createdAt).slice(0, 10);
      const legacyLogId = log.id != null ? String(log.id) : null;

      const result = insertLog.run(
        uid,
        actionKey,
        Number.isFinite(pontos) ? pontos : 0,
        actionDate,
        legacyLogId,
        createdAt
      );
      if (result.changes > 0) logsImported += 1;
      else logsSkipped += 1;
    }
  });

  txn();

  let token;
  let user;
  if (currentUserEmail) {
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(currentUserEmail);
    if (u) {
      token = signToken(config, u.id, u.email, u.role || 'user');
      user = userRowToApi(u);
    }
  }

  return { usersImported, logsImported, logsSkipped, token, user };
}

/**
 * Converte objeto do localStorage para INSERT (utilizadores criados pela app antiga).
 */
function localStorageUserToInsert(raw, email) {
  const passwordPlain =
    typeof raw.password === 'string' && raw.password.length > 0
      ? raw.password
      : `migrated-${crypto.randomBytes(12).toString('hex')}`;

  const fakeBody = {
    name: raw.name || 'Utilizador',
    email,
    password: passwordPlain,
    participantType: raw.participantType || 'visitante',
    classGroup: raw.classGroup || '',
    disciplina: raw.disciplina,
    cargo: raw.cargo,
    funcao: raw.funcao,
    escola: raw.escola,
    relacao: raw.relacao,
    outraEscolaSubtipo: inferOutraEscolaSubtipo(raw),
    cidade:
      raw.cidade || raw.cidadeNome
        ? {
            nome: raw.cidade || raw.cidadeNome,
            codigoIbge: raw.codigoIbgeCidade ?? raw.codigoIbge,
          }
        : { nome: 'Porto Alegre', codigoIbge: 4314902 },
  };

  const base = buildUserInsertPayload(fakeBody);
  return {
    ...base,
    legacy_user_id: raw.id != null ? String(raw.id) : null,
    password_hash: hashPassword(passwordPlain),
  };
}

function inferOutraEscolaSubtipo(raw) {
  if (raw.participantType !== 'outra_escola') return undefined;
  if (raw.subtipo === 'Aluno' || raw.subtipo === 'Professor(a)') {
    return raw.subtipo === 'Aluno' ? 'aluno' : 'professor';
  }
  if (raw.subtipo === 'Funcionário(a)') return 'funcionario';
  if (raw.subtipo === 'Visitante') return 'visitante';
  return 'visitante';
}
