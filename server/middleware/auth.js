// Verifica el access token del header Authorization: Bearer <token> y
// adjunta req.negocioId para que los controladores filtren siempre por tenant.
const { verifyAccessToken } = require('../services/tokens.service');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = verifyAccessToken(token);
    req.negocioId = payload.negocio_id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { requireAuth };
