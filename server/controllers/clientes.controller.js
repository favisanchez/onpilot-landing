const pool = require('../db/pool');
const { toListaShape } = require('../services/clientePresenter.service');
const { parsearArchivo } = require('../services/importer.service');

async function listar(req, res) {
  const q = (req.query.q || '').trim();
  const params = [req.negocioId];
  let where = 'negocio_id = $1';
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where += ` AND (lower(nombre) LIKE $2 OR telefono LIKE $2 OR lower(email) LIKE $2)`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM clientes WHERE ${where} ORDER BY nombre`,
    params
  );
  res.json(rows.map(toListaShape));
}

async function obtener(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1 AND negocio_id = $2', [
    id,
    req.negocioId,
  ]);
  const cliente = rows[0];
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const { rows: proximas } = await pool.query(
    `SELECT id, fecha, hora, servicio_nombre, canal_reserva, estado
       FROM citas
      WHERE cliente_id = $1 AND negocio_id = $2 AND estado != 'cancelada' AND fecha >= CURRENT_DATE
      ORDER BY fecha, hora`,
    [id, req.negocioId]
  );
  const { rows: hist } = await pool.query(
    `SELECT id, fecha, servicio_nombre, precio_base, precio_final, dto_vip, dto_adicional, creado_en
       FROM cobros
      WHERE cliente_id = $1 AND negocio_id = $2 AND estado = 'valido'
      ORDER BY creado_en DESC`,
    [id, req.negocioId]
  );

  res.json({
    ...toListaShape(cliente),
    proximas: proximas.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      hora: p.hora.slice(0, 5),
      svc: p.servicio_nombre,
      origen: p.canal_reserva,
      cancelled: p.estado === 'cancelada',
      cobrada: p.estado === 'cobrada',
    })),
    hist: hist.map((h) => ({
      id: h.id,
      f: h.fecha,
      s: h.servicio_nombre,
      base: h.precio_base,
      final: h.precio_final,
      dto: h.dto_vip + h.dto_adicional,
      ts: new Date(h.creado_en).getTime(),
    })),
  });
}

async function actualizar(req, res) {
  const { id } = req.params;
  const { nombre, telefono, email, vip, descuento_vip, notas } = req.body || {};

  const campos = [];
  const valores = [];
  function set(col, val) {
    valores.push(val);
    campos.push(`${col} = $${valores.length}`);
  }
  if (nombre !== undefined) set('nombre', nombre);
  if (telefono !== undefined) set('telefono', telefono);
  if (email !== undefined) set('email', email);
  if (notas !== undefined) set('notas', notas);
  if (descuento_vip !== undefined) {
    const dto = Math.max(0, Math.min(100, Number(descuento_vip) || 0));
    set('descuento_vip', dto);
  }
  if (vip !== undefined) {
    set('vip', !!vip);
    // Al quitar VIP se resetea el descuento, salvo que en esta misma
    // petición también se esté fijando uno nuevo explícitamente.
    if (!vip && descuento_vip === undefined) set('descuento_vip', 0);
  }
  if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  campos.push('actualizado_en = now()');
  valores.push(id, req.negocioId);
  const { rows } = await pool.query(
    `UPDATE clientes SET ${campos.join(', ')}
      WHERE id = $${valores.length - 1} AND negocio_id = $${valores.length}
      RETURNING *`,
    valores
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(toListaShape(rows[0]));
}

function avatarColorIdx(nombre) {
  let acc = 0;
  for (const ch of String(nombre)) acc += ch.charCodeAt(0);
  return acc % 5;
}

async function importarPreview(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo (campo "archivo")' });
  const filas = await parsearArchivo(req.file.buffer, req.file.originalname, req.file.mimetype);
  res.json({
    total: filas.length,
    validas: filas.filter((f) => f.estado === 'ok').length,
    filas,
  });
}

async function importarConfirmar(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo (campo "archivo")' });
  const filas = await parsearArchivo(req.file.buffer, req.file.originalname, req.file.mimetype);
  const validas = filas.filter((f) => f.estado === 'ok');

  const creados = [];
  for (const fila of validas) {
    const { nombre, telefono, email, notas } = fila.datos;
    const { rows } = await pool.query(
      `INSERT INTO clientes (negocio_id, nombre, telefono, email, notas, avatar_color_idx)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.negocioId, nombre, telefono || null, email || null, notas || '', avatarColorIdx(nombre)]
    );
    creados.push(toListaShape(rows[0]));
  }

  res.json({
    total: filas.length,
    importados: creados.length,
    errores: filas.length - validas.length,
    clientes: creados,
  });
}

module.exports = { listar, obtener, actualizar, importarPreview, importarConfirmar, avatarColorIdx };
