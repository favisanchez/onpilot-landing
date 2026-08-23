// Emisión y verificación de access tokens (JWT) y gestión de refresh tokens
// (opacos, guardados hasheados en BD, con rotación en cada uso).
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function signAccessToken(negocioId) {
  return jwt.sign({ negocio_id: negocioId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Crea un refresh token nuevo para un negocio y lo guarda hasheado.
// Devuelve el token en claro, que es lo único que va al cliente (cookie httpOnly).
async function createRefreshToken(negocioId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const expiraEn = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await pool.query(
    'INSERT INTO refresh_tokens (negocio_id, token_hash, expira_en) VALUES ($1, $2, $3)',
    [negocioId, hashToken(rawToken), expiraEn]
  );
  return rawToken;
}

// Valida un refresh token recibido, lo revoca y emite uno nuevo (rotación).
// Lanza un Error si el token no existe, ya fue revocado o expiró.
async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await pool.query(
    `SELECT id, negocio_id, expira_en, revocado_en FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row || row.revocado_en || new Date(row.expira_en) < new Date()) {
    throw new Error('Refresh token inválido o expirado');
  }
  await pool.query('UPDATE refresh_tokens SET revocado_en = now() WHERE id = $1', [row.id]);
  const nuevoRaw = await createRefreshToken(row.negocio_id);
  return { negocioId: row.negocio_id, rawToken: nuevoRaw };
}

async function revokeRefreshToken(rawToken) {
  await pool.query('UPDATE refresh_tokens SET revocado_en = now() WHERE token_hash = $1', [
    hashToken(rawToken),
  ]);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
