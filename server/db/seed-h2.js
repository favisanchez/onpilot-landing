// Datos de prueba de H2: conversaciones de ejemplo variadas (bot/pendiente/
// manual) para los negocios demo de H1. No toca "propuestas_reactivacion"
// aquí — esas se generan con el job real (node server/jobs/reactivacion.job.js
// o dejando correr el cron), que ya cruza los clientes reales sembrados en H1.
// Uso: node server/db/seed-h2.js
require('dotenv').config();
const pool = require('./pool');

const GUIONES = {
  bot: [
    { remitente: 'cliente', contenido: 'Hola, ¿podría cambiar mi cita de esta semana a otro día?' },
    { remitente: 'bot', contenido: '¡Claro! ¿Qué día y hora te vendrían mejor?' },
  ],
  pendiente: [
    { remitente: 'cliente', contenido: 'Necesito hablar con alguien del centro, es urgente' },
    { remitente: 'bot', contenido: 'Entendido, ahora mismo aviso al equipo para que te atienda.' },
    {
      remitente: 'sistema',
      contenido: 'Conversación escalada a una persona: el cliente pidió hablar con alguien del equipo.',
    },
  ],
  manual: [
    { remitente: 'cliente', contenido: 'Hola, quería preguntar por el tratamiento que me recomendasteis' },
    { remitente: 'profesional', contenido: '¡Hola! Sí, claro, te cuento con calma en cuanto pueda 😊' },
  ],
};

async function sembrarConversacionesH2() {
  const { rows: negocios } = await pool.query("SELECT id, nombre FROM negocios WHERE email LIKE 'demo.%' ORDER BY id");

  for (const negocio of negocios) {
    const { rows: existentes } = await pool.query('SELECT id FROM conversaciones WHERE negocio_id = $1', [
      negocio.id,
    ]);
    if (existentes.length > 0) {
      console.log(`- ${negocio.nombre}: ya tiene conversaciones, se omite`);
      continue;
    }

    const { rows: clientes } = await pool.query(
      'SELECT id, nombre, telefono FROM clientes WHERE negocio_id = $1 ORDER BY id LIMIT 3',
      [negocio.id]
    );
    const estados = ['bot', 'pendiente', 'manual'];
    let creadas = 0;
    for (let i = 0; i < clientes.length && i < estados.length; i++) {
      const cliente = clientes[i];
      const estado = estados[i];
      const { rows: convRows } = await pool.query(
        `INSERT INTO conversaciones (negocio_id, cliente_id, telefono, estado) VALUES ($1, $2, $3, $4) RETURNING id`,
        [negocio.id, cliente.id, cliente.telefono, estado]
      );
      const convId = convRows[0].id;
      for (const m of GUIONES[estado]) {
        await pool.query('INSERT INTO mensajes (conversacion_id, remitente, contenido) VALUES ($1, $2, $3)', [
          convId,
          m.remitente,
          m.contenido,
        ]);
      }
      creadas++;
    }
    console.log(`- ${negocio.nombre}: ${creadas} conversaciones sembradas`);
  }
}

if (require.main === module) {
  sembrarConversacionesH2()
    .then(() => {
      console.log('Listo.');
      pool.end();
    })
    .catch((err) => {
      console.error('Error sembrando conversaciones H2:', err);
      process.exit(1);
    });
}

module.exports = { sembrarConversacionesH2 };
