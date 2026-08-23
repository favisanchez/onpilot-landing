const pool = require('../db/pool');

async function obtener(req, res) {
  const { rows } = await pool.query(
    'SELECT id, nombre, sector, telefono, email, horarios, config_bot FROM negocios WHERE id = $1',
    [req.negocioId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Negocio no encontrado' });
  res.json(rows[0]);
}

async function actualizar(req, res) {
  const { nombre, sector, telefono, horarios } = req.body || {};

  const campos = [];
  const valores = [];
  function set(col, val) {
    valores.push(val);
    campos.push(`${col} = $${valores.length}`);
  }
  if (nombre !== undefined) set('nombre', nombre);
  if (sector !== undefined) set('sector', sector);
  if (telefono !== undefined) set('telefono', telefono);
  if (horarios !== undefined) set('horarios', JSON.stringify(horarios));
  if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  campos.push('actualizado_en = now()');
  valores.push(req.negocioId);
  const { rows } = await pool.query(
    `UPDATE negocios SET ${campos.join(', ')} WHERE id = $${valores.length}
     RETURNING id, nombre, sector, telefono, email, horarios, config_bot`,
    valores
  );
  res.json(rows[0]);
}

module.exports = { obtener, actualizar };
