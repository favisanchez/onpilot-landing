const pool = require('../db/pool');
const { getSemana } = require('../services/semana.service');
const { mondayOf, isPastDate, todayISODate } = require('../utils/dates');

async function listar(req, res) {
  const semanaParam = req.query.semana;
  const monday = mondayOf(semanaParam || todayISODate());
  const resultado = await getSemana(req.negocioId, monday);
  res.json(resultado);
}

async function crear(req, res) {
  const { cliente_id, servicio, fecha, hora, canal_reserva } = req.body || {};
  if (!cliente_id || !servicio || !fecha || !hora || !canal_reserva) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios (cliente_id, servicio, fecha, hora, canal_reserva)',
    });
  }
  if (isPastDate(fecha)) {
    return res.status(400).json({ error: 'No se pueden crear citas en fechas pasadas' });
  }

  const { rows: clienteRows } = await pool.query(
    'SELECT id, nombre FROM clientes WHERE id = $1 AND negocio_id = $2',
    [cliente_id, req.negocioId]
  );
  const cliente = clienteRows[0];
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  // El servicio puede venir como nombre libre o coincidir con el tarifario;
  // si coincide, se usa su duración real (antes quedaba fija en "60 min").
  const { rows: tarifRows } = await pool.query(
    'SELECT id, servicio, duracion_min FROM tarifario WHERE negocio_id = $1 AND lower(servicio) = lower($2)',
    [req.negocioId, servicio]
  );
  const tarifa = tarifRows[0];
  const duracionMin = tarifa ? tarifa.duracion_min : 60;
  const servicioNombre = tarifa ? tarifa.servicio : servicio;

  const { rows } = await pool.query(
    `INSERT INTO citas (negocio_id, cliente_id, tarifario_id, servicio_nombre, duracion_min, fecha, hora, canal_reserva)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.negocioId, cliente_id, tarifa ? tarifa.id : null, servicioNombre, duracionMin, fecha, hora, canal_reserva]
  );
  const cita = rows[0];

  res.status(201).json({
    id: cita.id,
    cliente_id: cita.cliente_id,
    h: cita.hora.slice(0, 5),
    n: cliente.nombre,
    s: `${cita.servicio_nombre} · ${cita.duracion_min} min`,
    e: cita.estado,
    today: cita.fecha === todayISODate(),
    cancelled: false,
  });
}

async function actualizar(req, res) {
  const { id } = req.params;
  const { estado } = req.body || {};
  // Este endpoint solo cancela citas; pasar a "cobrada" es responsabilidad
  // exclusiva de POST /api/cobros, que actualiza todo en una transacción.
  if (estado !== 'cancelada') {
    return res.status(400).json({ error: 'Solo se admite estado "cancelada" en este endpoint' });
  }
  const { rows } = await pool.query(
    `UPDATE citas SET estado = 'cancelada', actualizado_en = now()
      WHERE id = $1 AND negocio_id = $2 AND estado != 'cobrada'
      RETURNING *`,
    [id, req.negocioId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Cita no encontrada o ya cobrada (no se puede cancelar)' });
  }
  res.json({ id: rows[0].id, estado: rows[0].estado });
}

module.exports = { listar, crear, actualizar };
