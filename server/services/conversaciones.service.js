// Lógica de conversaciones reutilizable por el controlador HTTP, el
// webhook de WhatsApp entrante y el envío de propuestas de reactivación.
const pool = require('../db/pool');

// Busca la conversación de un teléfono para un negocio; si no existe la
// crea (puede llegar un mensaje de un número que aún no es cliente).
async function buscarOCrearConversacion(negocioId, telefono, clienteId = null) {
  const { rows } = await pool.query(
    `INSERT INTO conversaciones (negocio_id, telefono, cliente_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (negocio_id, telefono) DO UPDATE SET
       cliente_id = COALESCE(conversaciones.cliente_id, EXCLUDED.cliente_id)
     RETURNING *`,
    [negocioId, telefono, clienteId]
  );
  return rows[0];
}

async function guardarMensaje(conversacionId, remitente, contenido) {
  const { rows } = await pool.query(
    `INSERT INTO mensajes (conversacion_id, remitente, contenido) VALUES ($1, $2, $3) RETURNING *`,
    [conversacionId, remitente, contenido]
  );
  await pool.query(`UPDATE conversaciones SET ultima_actividad = now() WHERE id = $1`, [conversacionId]);
  return rows[0];
}

async function historialReciente(conversacionId, limite = 15) {
  const { rows } = await pool.query(
    `SELECT remitente, contenido, creado_en FROM mensajes
      WHERE conversacion_id = $1 ORDER BY creado_en DESC LIMIT $2`,
    [conversacionId, limite]
  );
  return rows.reverse(); // orden cronológico para el prompt
}

module.exports = { buscarOCrearConversacion, guardarMensaje, historialReciente };
