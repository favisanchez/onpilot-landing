// Registro, login y refresco de sesión. Cada negocio registrado es un tenant;
// no hay tabla de usuarios separada en esta fase (login = email+password del negocio).
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('../services/tokens.service');

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function negocioPublico(row) {
  return { id: row.id, nombre: row.nombre, sector: row.sector, email: row.email };
}

async function emitirSesion(res, negocioRow) {
  const accessToken = signAccessToken(negocioRow.id);
  const refreshToken = await createRefreshToken(negocioRow.id);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
  return { accessToken, negocio: negocioPublico(negocioRow) };
}

async function registro(req, res) {
  const { nombre, sector, email, password } = req.body || {};
  if (!nombre || !sector || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, sector, email, password)' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const { rows: existentes } = await pool.query('SELECT id FROM negocios WHERE email = $1', [
    email.toLowerCase(),
  ]);
  if (existentes.length > 0) {
    return res.status(409).json({ error: 'Ya existe un negocio registrado con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO negocios (nombre, sector, email, password_hash)
     VALUES ($1, $2, $3, $4) RETURNING id, nombre, sector, email`,
    [nombre, sector, email.toLowerCase(), passwordHash]
  );

  const sesion = await emitirSesion(res, rows[0]);
  res.status(201).json(sesion);
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan email o password' });
  }

  const { rows } = await pool.query('SELECT * FROM negocios WHERE email = $1', [email.toLowerCase()]);
  const negocio = rows[0];
  if (!negocio) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, negocio.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const sesion = await emitirSesion(res, negocio);
  res.json(sesion);
}

async function refresh(req, res) {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
  if (!token) return res.status(401).json({ error: 'No hay sesión' });

  let rotado;
  try {
    rotado = await rotateRefreshToken(token);
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  const { rows } = await pool.query('SELECT id, nombre, sector, email FROM negocios WHERE id = $1', [
    rotado.negocioId,
  ]);
  const negocio = rows[0];
  if (!negocio) return res.status(401).json({ error: 'Negocio no encontrado' });

  res.cookie(REFRESH_COOKIE_NAME, rotado.rawToken, cookieOptions());
  res.json({ accessToken: signAccessToken(negocio.id), negocio: negocioPublico(negocio) });
}

async function logout(req, res) {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
  if (token) await revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.status(204).end();
}

module.exports = { registro, login, refresh, logout };
