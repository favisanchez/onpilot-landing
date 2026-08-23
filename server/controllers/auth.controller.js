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
const { TERMINOS_VERSION } = require('../config/legal');
const { enviarEmail } = require('../services/email.service');

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

// Antepone https:// si el negocio escribió la URL sin protocolo (p.ej.
// "misitio.com"), y valida el resultado con el URL nativo de Node — no se
// comprueba que la web exista de verdad, solo que el formato sea válido.
function normalizarYValidarUrl(valor) {
  let v = String(valor || '').trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function avisarCuentaPendiente(negocio) {
  const admin = process.env.ADMIN_EMAIL || 'favi.sanchez.cano@gmail.com';
  await enviarEmail({
    to: admin,
    subject: `Onpilot — nueva cuenta pendiente de revisión: ${negocio.nombre}`,
    html: `
      <h2>Nueva cuenta pendiente de revisión</h2>
      <p><strong>Negocio:</strong> ${negocio.nombre}</p>
      <p><strong>Email de contacto:</strong> ${negocio.email}</p>
      <p><strong>Descripción del negocio:</strong> ${negocio.otro_descripcion}</p>
      <p><strong>Enlace aportado:</strong> <a href="${negocio.otro_web}">${negocio.otro_web}</a></p>
      <p>Para activarla: <code>UPDATE negocios SET estado = 'activo' WHERE email = '${negocio.email}';</code></p>
    `,
  });
}

async function registro(req, res) {
  const { nombre, sector, email, password, acepta_terminos, otro_descripcion, otro_web } = req.body || {};
  if (!nombre || !sector || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, sector, email, password)' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  // Nunca confiar solo en el frontend para algo con implicación legal: el
  // registro no puede completarse sin esta aceptación explícita.
  if (acepta_terminos !== true) {
    return res
      .status(400)
      .json({ error: 'Debes aceptar los Términos de Uso y la Política de Privacidad para registrarte' });
  }

  // Sector fuera del catálogo cerrado: hace falta contexto para poder
  // revisar la cuenta antes de activarla.
  const esOtroSector = sector === 'otro';
  let otroWebNormalizada = null;
  if (esOtroSector) {
    if (!otro_descripcion || !String(otro_descripcion).trim()) {
      return res.status(400).json({ error: 'Describe tu negocio para poder revisarlo' });
    }
    otroWebNormalizada = normalizarYValidarUrl(otro_web);
    if (!otroWebNormalizada) {
      return res.status(400).json({ error: 'El enlace a tu web o ficha de Google Business no es una URL válida' });
    }
  }
  const estado = esOtroSector ? 'pendiente_revision' : 'activo';

  const { rows: existentes } = await pool.query('SELECT id FROM negocios WHERE email = $1', [
    email.toLowerCase(),
  ]);
  if (existentes.length > 0) {
    return res.status(409).json({ error: 'Ya existe un negocio registrado con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO negocios (nombre, sector, email, password_hash, terminos_version, terminos_aceptados_en, estado, otro_descripcion, otro_web)
     VALUES ($1, $2, $3, $4, $5, now(), $6, $7, $8)
     RETURNING id, nombre, sector, email, estado, otro_descripcion, otro_web`,
    [
      nombre,
      sector,
      email.toLowerCase(),
      passwordHash,
      TERMINOS_VERSION,
      estado,
      esOtroSector ? String(otro_descripcion).trim() : null,
      otroWebNormalizada,
    ]
  );
  const negocio = rows[0];

  if (negocio.estado === 'pendiente_revision') {
    // El email es un aviso, no una condición: si falla, la cuenta ya está
    // creada igualmente — solo se loguea el error dentro del propio servicio.
    await avisarCuentaPendiente(negocio);
    return res.status(200).json({ pendiente: true, negocio: negocioPublico(negocio) });
  }

  const sesion = await emitirSesion(res, negocio);
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

  // Cuenta fuera del catálogo cerrado aún sin revisar: nunca se emite
  // sesión para ella, ni aquí ni en el registro.
  if (negocio.estado === 'pendiente_revision') {
    return res.status(200).json({ pendiente: true, negocio: negocioPublico(negocio) });
  }

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
