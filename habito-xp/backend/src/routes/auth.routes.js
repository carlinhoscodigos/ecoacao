import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { requireBodyFields } from '../utils.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const missing = requireBodyFields(req.body, ['email', 'password']);
    if (missing.length) return res.status(400).json({ error: 'validation', missing });

    const { email, password } = req.body;

    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, is_active, plan FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'invalid_credentials', message: 'Credenciais inválidas' });
    if (!user.is_active) return res.status(403).json({ error: 'inactive', message: 'Usuário inativo' });
    if (!user.password_hash) {
      return res.status(500).json({ error: 'server_error', message: 'Usuário sem senha configurada' });
    }

    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) return res.status(401).json({ error: 'invalid_credentials', message: 'Credenciais inválidas' });

    const token = signToken({ sub: user.id });
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    });
  } catch (err) {
    console.error('Erro no /auth/login:', err);
    return res.status(500).json({ error: 'server_error', message: 'Erro interno no login' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { rows } = await pool.query('SELECT id, email, name, plan, is_active FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'not_found' });
  return res.json({ user });
});

export default router;

