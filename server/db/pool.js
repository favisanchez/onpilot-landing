// Pool de conexiones a PostgreSQL, compartido por toda la app.
const { Pool, types } = require('pg');

// Las columnas DATE viajan como texto plano "YYYY-MM-DD", sin convertirlas a
// Date de JS: el driver, por defecto, las reinterpreta según la zona horaria
// del proceso al construir el objeto Date, lo que puede desplazar el día
// (p.ej. "2026-08-23" pasa a leerse como "2026-08-22" en zonas UTC+). Como un
// "date" de Postgres no tiene zona horaria, la conversión no aporta nada y
// solo introduce ese bug — se desactiva para esta OID (1082 = date).
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
