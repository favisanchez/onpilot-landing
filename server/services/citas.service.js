// Lógica de citas reutilizable por el controlador HTTP de H1 y por las
// herramientas del bot de H2 (consultar disponibilidad, crear y cancelar
// citas) — una sola implementación, nunca duplicada.
const pool = require('../db/pool');
const { getSemana } = require('./semana.service');
const { mondayOf, isPastDate, todayISODate } = require('../utils/dates');

// Error con status HTTP adjunto: el middleware de errores ya sabe pintarlo
// (server/middleware/errorHandler.js), tanto si lo lanza el controlador
// como si lo lanza el bot al intentar usar esta misma lógica.
class CitasError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function crearCita(negocioId, { cliente_id, servicio, fecha, hora, canal_reserva }) {
  if (!cliente_id || !servicio || !fecha || !hora || !canal_reserva) {
    throw new CitasError(400, 'Faltan campos obligatorios (cliente_id, servicio, fecha, hora, canal_reserva)');
  }
  if (isPastDate(fecha)) {
    throw new CitasError(400, 'No se pueden crear citas en fechas pasadas');
  }

  const { rows: clienteRows } = await pool.query(
    'SELECT id, nombre FROM clientes WHERE id = $1 AND negocio_id = $2',
    [cliente_id, negocioId]
  );
  const cliente = clienteRows[0];
  if (!cliente) throw new CitasError(404, 'Cliente no encontrado');

  // El servicio puede venir como nombre libre o coincidir con el tarifario;
  // si coincide, se usa su duración real (antes quedaba fija en "60 min").
  const { rows: tarifRows } = await pool.query(
    'SELECT id, servicio, duracion_min FROM tarifario WHERE negocio_id = $1 AND lower(servicio) = lower($2)',
    [negocioId, servicio]
  );
  const tarifa = tarifRows[0];
  const duracionMin = tarifa ? tarifa.duracion_min : 60;
  const servicioNombre = tarifa ? tarifa.servicio : servicio;

  const { rows } = await pool.query(
    `INSERT INTO citas (negocio_id, cliente_id, tarifario_id, servicio_nombre, duracion_min, fecha, hora, canal_reserva)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [negocioId, cliente_id, tarifa ? tarifa.id : null, servicioNombre, duracionMin, fecha, hora, canal_reserva]
  );
  const cita = rows[0];

  return {
    id: cita.id,
    cliente_id: cita.cliente_id,
    h: cita.hora.slice(0, 5),
    n: cliente.nombre,
    s: `${cita.servicio_nombre} · ${cita.duracion_min} min`,
    e: cita.estado,
    today: cita.fecha === todayISODate(),
    cancelled: false,
  };
}

async function cancelarCita(negocioId, citaId) {
  const { rows } = await pool.query(
    `UPDATE citas SET estado = 'cancelada', actualizado_en = now()
      WHERE id = $1 AND negocio_id = $2 AND estado != 'cobrada'
      RETURNING *`,
    [citaId, negocioId]
  );
  if (rows.length === 0) {
    throw new CitasError(404, 'Cita no encontrada o ya cobrada (no se puede cancelar)');
  }
  return { id: rows[0].id, estado: rows[0].estado };
}

async function listarSemana(negocioId, semanaParam) {
  const monday = mondayOf(semanaParam || todayISODate());
  return getSemana(negocioId, monday);
}

// Citas ya existentes ese día (no calcula huecos libres contra un horario
// de apertura todavía — config_bot.horario_atencion no tiene una forma
// definida aún — pero es suficiente para que el bot sepa qué horas evitar).
async function consultarDisponibilidad(negocioId, fecha) {
  const { rows } = await pool.query(
    `SELECT hora, duracion_min, servicio_nombre, estado FROM citas
      WHERE negocio_id = $1 AND fecha = $2 AND estado != 'cancelada'
      ORDER BY hora`,
    [negocioId, fecha]
  );
  return rows.map((r) => ({
    hora: r.hora.slice(0, 5),
    duracion_min: r.duracion_min,
    servicio: r.servicio_nombre,
    estado: r.estado,
  }));
}

module.exports = { crearCita, cancelarCita, listarSemana, consultarDisponibilidad, CitasError };
