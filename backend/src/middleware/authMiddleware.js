import { verifyToken } from '../services/authService.js';

export function createAuthMiddleware(config) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ error: 'missing_token' });
    }
    try {
      const decoded = verifyToken(config, token);
      const sub = decoded.sub;
      req.userId = typeof sub === 'string' ? Number.parseInt(sub, 10) : Number(sub);
      if (Number.isNaN(req.userId)) {
        return res.status(401).json({ error: 'invalid_token' });
      }
      req.userEmail = decoded.email;
      req.userRole = decoded.role || null;
      next();
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}

export function createAdminMiddleware(config, getDb) {
  const auth = createAuthMiddleware(config);

  return function adminMiddleware(req, res, next) {
    auth(req, res, () => {
      const db = getDb(config);
      const user = db
        .prepare('SELECT id, email, nome, role FROM users WHERE id = ?')
        .get(req.userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'admin_only' });
      }

      req.userEmail = user.email;
      req.userName = user.nome;
      req.userRole = user.role;
      next();
    });
  };
}
