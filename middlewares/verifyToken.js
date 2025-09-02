// middlewares/verifyToken.js
import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || req.headers.Authorization || '';
    // aceita "Bearer <token>" OU só "<token>"
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;

    if (!token) {
      return res.status(401).json({ error: 'Token ausente' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Configuração inválida do servidor' });
    }

    const payload = jwt.verify(token, secret);
    // use o mesmo campo que você gravou ao criar o token
    req.userId = payload.userId || payload.id || payload.sub;

    if (!req.userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    next();
  } catch (err) {
    console.error('verifyToken:', err.message);
    return res.status(401).json({ error: 'Não autorizado' });
  }
}
