import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth } from '../auth.js';
import { requireBodyFields } from '../utils.js';

const router = express.Router();
router.use(requireAuth);

async function requireAdmin(req, res, next) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1 LIMIT 1', [userId]);
  const role = rows[0]?.role || 'user';
  if (role !== 'admin') return res.status(403).json({ error: 'forbidden', message: 'Apenas admin' });
  return next();
}

router.use(requireAdmin);

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, plan, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 100`
  );
  res.json({ users: rows });
});

router.post('/', async (req, res) => {
  const missing = requireBodyFields(req.body, ['name', 'email', 'password']);
  if (missing.length) return res.status(400).json({ error: 'validation', missing });

  const name = String(req.body.name || '').trim().slice(0, 150);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const plan = String(req.body.plan || 'free');
  const role = String(req.body.role || 'user');
  const isActive = req.body.is_active === undefined ? true : Boolean(req.body.is_active);

  if (!name) return res.status(400).json({ error: 'validation', message: 'Nome inválido' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'validation', message: 'E-mail inválido' });
  if (password.length < 6) return res.status(400).json({ error: 'validation', message: 'Senha deve ter pelo menos 6 caracteres' });
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'validation', message: 'Role inválida' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, plan, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, plan, role, is_active, created_at`,
      [name, email, passwordHash, plan, role, isActive]
    );
    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'conflict', message: 'Já existe usuário com este e-mail' });
    }
    throw err;
  }
});

export default router;

