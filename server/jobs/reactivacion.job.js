// Una vez al día: cruza clientes con el umbral de inactividad configurado
// (mismo criterio que el tag "Reactivar" de H1 — no VIP, visitas por
// encima del mínimo) y genera propuestas de reactivación con mensajes
// plantilla. No llama a Claude por candidato: mantiene el job barato y
// determinista, el encargo solo pide un mensaje sugerido, no que lo
// redacte un LLM.
const pool = require('../db/pool');
const { conConfigBot } = require('../services/configBot.service');

const PLANTILLAS = [
  {
    tipo: 'oferta_vuelta',
    coste: 0.065,
    mensaje: (nombre, negocio) => `¡Hola ${nombre}! Hace tiempo que no te vemos por ${negocio} — te echamos de menos. ¿Te apetece que te reservemos un hueco esta semana?`,
  },
  {
    tipo: 'recordatorio',
    coste: 0.065,
    mensaje: (nombre, negocio) => `Hola ${nombre}, desde ${negocio} te recordamos que ya toca tu próxima revisión. ¿Reservamos cita?`,
  },
];

async function ejecutarReactivacion() {
  const { rows: negocios } = await pool.query('SELECT id, nombre, config_bot FROM negocios');

  for (const negocio of negocios) {
    const config = conConfigBot(negocio.config_bot);

    const { rows: candidatos } = await pool.query(
      `SELECT id FROM clientes
        WHERE negocio_id = $1
          AND vip = false
          AND visitas >= $2
          AND ultima_visita IS NOT NULL
          AND ultima_visita < CURRENT_DATE - ($3 || ' days')::interval
          AND NOT EXISTS (
            SELECT 1 FROM propuestas_reactivacion p
             WHERE p.cliente_id = clientes.id AND p.estado = 'pendiente'
          )`,
      [negocio.id, config.minimo_visitas_reactivacion, config.umbral_inactividad_dias]
    );

    for (const cliente of candidatos) {
      const { rows: clienteRows } = await pool.query('SELECT nombre FROM clientes WHERE id = $1', [cliente.id]);
      const nombre = clienteRows[0].nombre;
      for (const plantilla of PLANTILLAS) {
        await pool.query(
          `INSERT INTO propuestas_reactivacion (negocio_id, cliente_id, tipo, mensaje_sugerido, coste_estimado)
           VALUES ($1, $2, $3, $4, $5)`,
          [negocio.id, cliente.id, plantilla.tipo, plantilla.mensaje(nombre, negocio.nombre), plantilla.coste]
        );
      }
    }
  }
}

module.exports = { ejecutarReactivacion };
