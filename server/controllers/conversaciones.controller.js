const pool = require('../db/pool');
const { toConversacionShape } = require('../services/conversacionPresenter.service');
const { guardarMensaje } = require('../services/conversaciones.service');
const { enviarMensajeWhatsapp } = require('../services/whatsapp.service');

const ESTADOS_VALIDOS = ['bot', 'pendiente', 'manual'];

async function listar(req, res) {
  const estado = req.query.estado;
  const params = [req.negocioId];
  let where = 'c.negocio_id = $1';
  if (estado && ESTADOS_VALIDOS.includes(estado)) {
    params.push(estado);
    where += ` AND c.estado = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT c.*, cl.nombre AS cliente_nombre, cl.avatar_color_idx AS cliente_ci,
            m.contenido AS ultimo_mensaje, m.remitente AS ultimo_remitente
       FROM conversaciones c
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
       LEFT JOIN LATERAL (
         SELECT contenido, remitente FROM mensajes
          WHERE conversacion_id = c.id ORDER BY creado_en DESC LIMIT 1
       ) m ON true
      WHERE ${where}
      ORDER BY c.ultima_actividad DESC`,
    params
  );
  res.json(rows.map(toConversacionShape));
}

async function obtenerMensajes(req, res) {
  const { id } = req.params;
  const { rows: convRows } = await pool.query('SELECT id FROM conversaciones WHERE id = $1 AND negocio_id = $2', [
    id,
    req.negocioId,
  ]);
  if (convRows.length === 0) return res.status(404).json({ error: 'Conversación no encontrada' });

  const { rows } = await pool.query(
    'SELECT remitente AS type, contenido AS text, creado_en FROM mensajes WHERE conversacion_id = $1 ORDER BY creado_en',
    [id]
  );
  res.json(rows);
}

async function enviarMensaje(req, res) {
  const { id } = req.params;
  const { contenido } = req.body || {};
  if (!contenido || !String(contenido).trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const { rows } = await pool.query(
    `SELECT c.*, n.whatsapp_phone_number_id
       FROM conversaciones c JOIN negocios n ON n.id = c.negocio_id
      WHERE c.id = $1 AND c.negocio_id = $2`,
    [id, req.negocioId]
  );
  const conv = rows[0];
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  const mensaje = await guardarMensaje(conv.id, 'profesional', contenido.trim());

  if (conv.canal === 'whatsapp' && conv.whatsapp_phone_number_id) {
    await enviarMensajeWhatsapp(conv.whatsapp_phone_number_id, conv.telefono, contenido.trim());
  }

  res.status(201).json({ type: mensaje.remitente, text: mensaje.contenido, creado_en: mensaje.creado_en });
}

async function actualizarControl(req, res) {
  const { id } = req.params;
  const { estado } = req.body || {};
  if (!['manual', 'bot'].includes(estado)) {
    return res.status(400).json({ error: 'estado debe ser "manual" o "bot"' });
  }
  const { rows } = await pool.query(
    `UPDATE conversaciones SET estado = $3, ultima_actividad = now()
      WHERE id = $1 AND negocio_id = $2 RETURNING id, estado`,
    [id, req.negocioId, estado]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Conversación no encontrada' });
  res.json(rows[0]);
}

module.exports = { listar, obtenerMensajes, enviarMensaje, actualizarControl };
