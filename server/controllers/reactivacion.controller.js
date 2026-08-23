const pool = require('../db/pool');
const { initials } = require('../services/conversacionPresenter.service');
const { buscarOCrearConversacion, guardarMensaje } = require('../services/conversaciones.service');
const { enviarMensajeWhatsapp } = require('../services/whatsapp.service');

const TIPO_LABEL = {
  oferta_vuelta: 'Oferta de vuelta',
  recordatorio: 'Recordatorio',
  pack_descuento: 'Pack descuento',
  vip_exclusiva: 'Oferta VIP exclusiva',
};

function agruparPorCliente(rows) {
  const porCliente = new Map();
  for (const r of rows) {
    if (!porCliente.has(r.cliente_id)) {
      const dias = r.ultima_visita
        ? Math.floor((Date.now() - new Date(r.ultima_visita).getTime()) / 86400000)
        : null;
      porCliente.set(r.cliente_id, {
        cliente_id: r.cliente_id,
        name: r.nombre,
        init: initials(r.nombre),
        ci: r.ci,
        dias,
        lastService: r.ultimo_servicio || '',
        visitas: r.visitas,
        gasto: r.gasto_total,
        proposals: [],
      });
    }
    porCliente.get(r.cliente_id).proposals.push({
      id: r.id,
      type: TIPO_LABEL[r.tipo] || r.tipo,
      msg: r.mensaje_sugerido,
      coste: `${r.coste_estimado}€`,
    });
  }
  return Array.from(porCliente.values());
}

async function listarPendientes(req, res) {
  const { rows } = await pool.query(
    `SELECT p.*, cl.nombre, cl.avatar_color_idx AS ci, cl.visitas, cl.gasto_total, cl.ultima_visita,
            ult.servicio_nombre AS ultimo_servicio
       FROM propuestas_reactivacion p
       JOIN clientes cl ON cl.id = p.cliente_id
       LEFT JOIN LATERAL (
         SELECT servicio_nombre FROM cobros
          WHERE cliente_id = p.cliente_id AND estado = 'valido'
          ORDER BY creado_en DESC LIMIT 1
       ) ult ON true
      WHERE p.negocio_id = $1 AND p.estado = 'pendiente'
      ORDER BY cl.ultima_visita ASC NULLS LAST, p.creado_en`,
    [req.negocioId]
  );
  res.json(agruparPorCliente(rows));
}

async function enviarPropuesta(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT p.*, cl.telefono, n.whatsapp_phone_number_id
       FROM propuestas_reactivacion p
       JOIN clientes cl ON cl.id = p.cliente_id
       JOIN negocios n ON n.id = p.negocio_id
      WHERE p.id = $1 AND p.negocio_id = $2`,
    [id, req.negocioId]
  );
  const propuesta = rows[0];
  if (!propuesta) return res.status(404).json({ error: 'Propuesta no encontrada' });
  if (propuesta.estado !== 'pendiente') {
    return res.status(409).json({ error: `La propuesta ya está en estado "${propuesta.estado}"` });
  }
  if (!propuesta.telefono) {
    return res.status(400).json({ error: 'El cliente no tiene teléfono registrado' });
  }

  const conv = await buscarOCrearConversacion(req.negocioId, propuesta.telefono, propuesta.cliente_id);
  await guardarMensaje(conv.id, 'profesional', propuesta.mensaje_sugerido);
  if (propuesta.whatsapp_phone_number_id) {
    await enviarMensajeWhatsapp(propuesta.whatsapp_phone_number_id, propuesta.telefono, propuesta.mensaje_sugerido);
  }

  const { rows: actualizado } = await pool.query(
    `UPDATE propuestas_reactivacion SET estado = 'enviada', actualizado_en = now() WHERE id = $1 RETURNING id, estado`,
    [id]
  );
  // Al enviar una propuesta, el cliente sale de la lista de pendientes: las
  // demás propuestas alternativas para el mismo cliente quedan descartadas
  // (ya se le ha escrito en este ciclo, no tiene sentido ofrecerle la otra).
  await pool.query(
    `UPDATE propuestas_reactivacion SET estado = 'descartada', actualizado_en = now()
      WHERE negocio_id = $1 AND cliente_id = $2 AND estado = 'pendiente' AND id != $3`,
    [req.negocioId, propuesta.cliente_id, id]
  );
  res.json(actualizado[0]);
}

async function editarPropuesta(req, res) {
  const { mensaje_sugerido } = req.body || {};
  if (!mensaje_sugerido || !String(mensaje_sugerido).trim()) {
    return res.status(400).json({ error: 'mensaje_sugerido es obligatorio' });
  }
  const { rows } = await pool.query(
    `UPDATE propuestas_reactivacion SET mensaje_sugerido = $3, actualizado_en = now()
      WHERE id = $1 AND negocio_id = $2 AND estado = 'pendiente'
      RETURNING id, mensaje_sugerido`,
    [req.params.id, req.negocioId, mensaje_sugerido.trim()]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Propuesta no encontrada o ya no está pendiente' });
  }
  res.json(rows[0]);
}

async function descartarPropuesta(req, res) {
  const { rows } = await pool.query(
    `DELETE FROM propuestas_reactivacion WHERE id = $1 AND negocio_id = $2 RETURNING id, cliente_id`,
    [req.params.id, req.negocioId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Propuesta no encontrada' });
  // Mismo criterio que al enviar: descartar una propuesta saca al cliente
  // de la lista de pendientes, no solo esa alternativa concreta.
  await pool.query(
    `UPDATE propuestas_reactivacion SET estado = 'descartada', actualizado_en = now()
      WHERE negocio_id = $1 AND cliente_id = $2 AND estado = 'pendiente'`,
    [req.negocioId, rows[0].cliente_id]
  );
  res.status(204).end();
}

module.exports = { listarPendientes, enviarPropuesta, editarPropuesta, descartarPropuesta };
