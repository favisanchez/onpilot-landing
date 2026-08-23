const pool = require('../db/pool');

async function resumen(req, res) {
  const { rows: recordatoriosRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM recordatorios_enviados re
       JOIN citas c ON c.id = re.cita_id WHERE c.negocio_id = $1`,
    [req.negocioId]
  );

  const { rows: convRows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE existe_cliente)::int AS con_mensaje_cliente,
       COUNT(*) FILTER (WHERE existe_cliente AND existe_respuesta)::int AS con_respuesta
     FROM (
       SELECT c.id,
         EXISTS(SELECT 1 FROM mensajes m WHERE m.conversacion_id = c.id AND m.remitente = 'cliente') AS existe_cliente,
         EXISTS(SELECT 1 FROM mensajes m WHERE m.conversacion_id = c.id AND m.remitente IN ('bot', 'profesional')) AS existe_respuesta
       FROM conversaciones c WHERE c.negocio_id = $1
     ) sub`,
    [req.negocioId]
  );
  const { con_mensaje_cliente: total, con_respuesta: respondidas } = convRows[0];
  const tasaRespuesta = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  res.json({
    recordatoriosEnviados: recordatoriosRows[0].total,
    conversacionesTotales: total,
    tasaRespuesta,
  });
}

module.exports = { resumen };
