// Construye la respuesta de GET /api/citas?semana=, agrupando las citas de
// una semana real en el mismo formato de claves 0..6 (lunes..domingo) que ya
// usaba el frontend con su "agendaData" en memoria, para no tocar los renders.
const pool = require('../db/pool');
const { weekDates, todayISODate } = require('../utils/dates');

async function getSemana(negocioId, mondayStr) {
  const dias = weekDates(mondayStr);
  const { rows } = await pool.query(
    `SELECT c.id, c.cliente_id, cl.nombre AS cliente_nombre, c.servicio_nombre,
            c.duracion_min, c.fecha, c.hora, c.canal_reserva, c.estado
       FROM citas c
       JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.negocio_id = $1 AND c.fecha BETWEEN $2 AND $3
      ORDER BY c.fecha, c.hora`,
    [negocioId, dias[0], dias[6]]
  );

  const hoy = todayISODate();
  const porDia = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const row of rows) {
    const fechaISO = row.fecha;
    const idx = dias.indexOf(fechaISO);
    if (idx === -1) continue;
    porDia[idx].push({
      id: row.id,
      cliente_id: row.cliente_id,
      h: row.hora.slice(0, 5),
      n: row.cliente_nombre,
      s: `${row.servicio_nombre} · ${row.duracion_min} min`,
      e: row.estado,
      today: fechaISO === hoy,
      // "cancelled" cierra la tarjeta en la UI original tanto al cancelar
      // como al cobrar (dConfirmCob ya hacía esto mismo sobre el dato falso).
      cancelled: row.estado === 'cancelada' || row.estado === 'cobrada',
      canal_reserva: row.canal_reserva,
    });
  }

  return { semana: mondayStr, dias: porDia };
}

module.exports = { getSemana };
