// Webhook de WhatsApp Cloud API: verificación (GET, handshake de Meta) y
// recepción de mensajes entrantes (POST).
const pool = require('../db/pool');
const { firmaValida } = require('../services/whatsapp.service');
const { buscarOCrearConversacion, guardarMensaje } = require('../services/conversaciones.service');
const { responderComoBot } = require('../services/bot.service');

function verificar(req, res) {
  const modo = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (modo === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

async function recibir(req, res) {
  const firma = req.headers['x-hub-signature-256'];
  if (!firmaValida(req.rawBody, firma)) {
    console.error('Webhook de WhatsApp: firma inválida, se descarta el mensaje');
    return res.sendStatus(401);
  }
  // Meta espera un 200 rápido; procesamos y respondemos al final (volumen
  // de piloto, no hace falta una cola aparte para esto todavía).
  res.sendStatus(200);

  try {
    const entradas = req.body?.entry || [];
    for (const entrada of entradas) {
      for (const cambio of entrada.changes || []) {
        const valor = cambio.value || {};
        const phoneNumberId = valor.metadata?.phone_number_id;
        if (!phoneNumberId || !Array.isArray(valor.messages)) continue;

        const { rows: negocioRows } = await pool.query(
          'SELECT id FROM negocios WHERE whatsapp_phone_number_id = $1',
          [phoneNumberId]
        );
        const negocio = negocioRows[0];
        if (!negocio) {
          console.error('Mensaje de WhatsApp para un phone_number_id sin negocio asociado:', phoneNumberId);
          continue;
        }

        for (const mensaje of valor.messages) {
          const telefono = mensaje.from;
          const texto = mensaje.text?.body || `[mensaje de tipo ${mensaje.type}, no soportado todavía]`;

          const { rows: clienteRows } = await pool.query(
            'SELECT id FROM clientes WHERE negocio_id = $1 AND telefono = $2',
            [negocio.id, telefono]
          );
          const clienteId = clienteRows[0]?.id || null;

          const conv = await buscarOCrearConversacion(negocio.id, telefono, clienteId);
          await guardarMensaje(conv.id, 'cliente', texto);

          if (conv.estado === 'bot') {
            await responderComoBot(negocio.id, conv.id);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error procesando webhook de WhatsApp:', err);
  }
}

module.exports = { verificar, recibir };
