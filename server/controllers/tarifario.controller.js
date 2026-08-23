const pool = require('../db/pool');

function toShape(row) {
  return {
    id: row.id,
    s: row.servicio,
    cat: row.categoria,
    precio: row.precio,
    dur: `${row.duracion_min} min`,
  };
}

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM tarifario WHERE negocio_id = $1 AND activo = true ORDER BY categoria, servicio',
    [req.negocioId]
  );
  res.json(rows.map(toShape));
}

async function crear(req, res) {
  const { servicio, categoria, precio, duracion_min } = req.body || {};
  if (!servicio || !categoria || precio === undefined || !duracion_min) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (servicio, categoria, precio, duracion_min)' });
  }
  const { rows } = await pool.query(
    `INSERT INTO tarifario (negocio_id, servicio, categoria, precio, duracion_min)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.negocioId, servicio, categoria, precio, duracion_min]
  );
  res.status(201).json(toShape(rows[0]));
}

function duracionAMinutos(dur) {
  // Acepta "60 min" o directamente un número de minutos.
  const n = parseInt(String(dur).replace(/\D+/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

async function actualizar(req, res) {
  const { id } = req.params;
  const { precio, dur, duracion_min, categoria, servicio } = req.body || {};

  const campos = [];
  const valores = [];
  function set(col, val) {
    valores.push(val);
    campos.push(`${col} = $${valores.length}`);
  }
  if (servicio !== undefined) set('servicio', servicio);
  if (categoria !== undefined) set('categoria', categoria);
  if (precio !== undefined) set('precio', precio);
  const minutos = duracion_min !== undefined ? duracion_min : dur !== undefined ? duracionAMinutos(dur) : undefined;
  if (minutos !== undefined && minutos !== null) set('duracion_min', minutos);
  if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  campos.push('actualizado_en = now()');
  valores.push(id, req.negocioId);
  const { rows } = await pool.query(
    `UPDATE tarifario SET ${campos.join(', ')}
      WHERE id = $${valores.length - 1} AND negocio_id = $${valores.length}
      RETURNING *`,
    valores
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json(toShape(rows[0]));
}

module.exports = { listar, crear, actualizar, toShape };
