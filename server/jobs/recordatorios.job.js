// Cada 15 minutos: busca citas confirmadas dentro de alguna de las
// ventanas de recordatorio configuradas (config_bot.recordatorios_horas_antes,
// por defecto 24/12/2h) que todavía no tengan recordatorio enviado para esa
// ventana, y lo manda por WhatsApp.
const pool = require('../db/pool');
const { conConfigBot } = require('../services/configBot.service');
const { enviarMensajeWhatsapp } = require('../services/whatsapp.service');

async function ejecutarRecordatorios() {
  const { rows: negocios } = await pool.query(
    `SELECT id, nombre, config_bot, whatsapp_phone_number_id FROM negocios WHERE whatsapp_phone_number_id IS NOT NULL`
  );

  for (const negocio of negocios) {
    const config = conConfigBot(negocio.config_bot);
    const ventanas = Array.isArray(config.recordatorios_horas_antes) ? config.recordatorios_horas_antes : [24, 12, 2];

    for (const horas of ventanas) {
      const { rows: citas } = await pool.query(
        `SELECT c.id, c.fecha, c.hora, c.servicio_nombre, cl.nombre AS cliente_nombre, cl.telefono
           FROM citas c
           JOIN clientes cl ON cl.id = c.cliente_id
          WHERE c.negocio_id = $1
            AND c.estado = 'confirmada'
            AND (c.fecha + c.hora) BETWEEN now() + ($2 || ' hours')::interval - INTERVAL '15 minutes'
                                        AND now() + ($2 || ' hours')::interval
            AND NOT EXISTS (
              SELECT 1 FROM recordatorios_enviados re WHERE re.cita_id = c.id AND re.horas_antes = $2
            )`,
        [negocio.id, horas]
      );

      for (const cita of citas) {
        if (!cita.telefono) continue;
        const texto = `Hola ${cita.cliente_nombre}, te recordamos tu cita de "${cita.servicio_nombre}" el ${cita.fecha} a las ${cita.hora.slice(0, 5)}h con ${negocio.nombre}. Responde para confirmar o cancelar.`;
        await enviarMensajeWhatsapp(negocio.whatsapp_phone_number_id, cita.telefono, texto);
        await pool.query(
          `INSERT INTO recordatorios_enviados (cita_id, horas_antes) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [cita.id, horas]
        );
      }
    }
  }
}

module.exports = { ejecutarRecordatorios };
