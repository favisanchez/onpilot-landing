// Registro de los jobs programados de H2. Sin Redis/Bull: para el volumen
// de un piloto, un scheduler dentro del propio proceso Node es suficiente
// (node-cron), migrable a una cola real si hace falta escalar más adelante.
const cron = require('node-cron');
const { ejecutarRecordatorios } = require('./recordatorios.job');
const { ejecutarReactivacion } = require('./reactivacion.job');

function iniciarJobs() {
  // Cada 15 minutos: recordatorios de citas próximas.
  cron.schedule('*/15 * * * *', () => {
    ejecutarRecordatorios().catch((err) => console.error('Error en job de recordatorios:', err));
  });

  // Una vez al día a las 03:00: motor de reactivación de clientes inactivos.
  cron.schedule('0 3 * * *', () => {
    ejecutarReactivacion().catch((err) => console.error('Error en job de reactivación:', err));
  });

  console.log('Jobs de H2 (recordatorios, reactivación) programados.');
}

module.exports = { iniciarJobs };
