import { hashPassword } from './authService.js';

const DEFAULT_ADMIN_EMAIL = 'carlosdanielterciario@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'carloslos12';
const DEFAULT_ADMIN_NAME = 'Administrador do Sistema';

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function ensureAdminSeed(config, getDb) {
  const db = getDb(config);
  const email = normalizeEmail(config.adminSeedEmail || DEFAULT_ADMIN_EMAIL);
  const password = String(config.adminSeedPassword || DEFAULT_ADMIN_PASSWORD);
  const name = String(config.adminSeedName || DEFAULT_ADMIN_NAME).trim() || DEFAULT_ADMIN_NAME;
  const now = new Date().toISOString();

  const existing = db
    .prepare('SELECT id, role FROM users WHERE email = ?')
    .get(email);

  if (existing) {
    if (existing.role !== 'admin') {
      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(
        'admin',
        now,
        existing.id
      );
      return { created: false, promoted: true, email };
    }

    return { created: false, promoted: false, email };
  }

  db.prepare(
    `INSERT INTO users (nome, email, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(name, email, hashPassword(password), 'admin', now, now);

  return { created: true, promoted: false, email };
}
