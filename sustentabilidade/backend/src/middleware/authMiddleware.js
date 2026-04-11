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
      next();
    } catch {
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
