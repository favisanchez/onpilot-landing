// Cierre de caja: agregados de facturación por periodo, servicio top,
// gráfico de los últimos 6 meses y lista de cobros recientes. Todo se
// calcula sobre "cobros" en estado 'valido' (los marcados como error no
// cuentan para la facturación).
const pool = require('../db/pool');
const { todayISODate, mondayOf, weekDates } = require('../utils/dates');

function rangoDePeriodo(periodo) {
  const hoy = todayISODate();
  if (periodo === 'semana') {
    const dias = weekDates(mondayOf(hoy));
    return { desde: dias[0], hasta: dias[6] };
  }
  if (periodo === 'mes') {
    const [y, m] = hoy.split('-');
    const desde = `${y}-${m}-01`;
    const ultimoDia = new Date(Number(y), Number(m), 0).getDate();
    return { desde, hasta: `${y}-${m}-${String(ultimoDia).padStart(2, '0')}` };
  }
  if (periodo === 'anio') {
    const y = hoy.split('-')[0];
    return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
  }
  return { desde: hoy, hasta: hoy }; // 'dia' por defecto
}

async function resumen(req, res) {
  const periodo = ['dia', 'semana', 'mes', 'anio'].includes(req.query.periodo) ? req.query.periodo : 'dia';
  const { desde, hasta } = rangoDePeriodo(periodo);

  const { rows: totales } = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(precio_final),0)::int AS total
       FROM cobros
      WHERE negocio_id = $1 AND estado = 'valido' AND fecha BETWEEN $2 AND $3`,
    [req.negocioId, desde, hasta]
  );

  const { rows: topServicioRows } = await pool.query(
    `SELECT servicio_nombre, SUM(precio_final)::int AS total
       FROM cobros
      WHERE negocio_id = $1 AND estado = 'valido' AND fecha BETWEEN $2 AND $3
      GROUP BY servicio_nombre
      ORDER BY total DESC
      LIMIT 1`,
    [req.negocioId, desde, hasta]
  );

  const { rows: recientes } = await pool.query(
    `SELECT c.id, c.fecha, c.servicio_nombre, c.precio_final, c.creado_en, cl.nombre AS cliente_nombre
       FROM cobros c
       JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.negocio_id = $1 AND c.estado = 'valido' AND c.fecha BETWEEN $2 AND $3
      ORDER BY c.creado_en DESC
      LIMIT 20`,
    [req.negocioId, desde, hasta]
  );

  const { rows: chart } = await pool.query(
    `SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS mes, SUM(precio_final)::int AS total
       FROM cobros
      WHERE negocio_id = $1 AND estado = 'valido' AND fecha >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY 1
      ORDER BY 1`,
    [req.negocioId]
  );

  const count = totales[0].count;
  const total = totales[0].total;

  res.json({
    periodo,
    total,
    count,
    ticketMedio: count > 0 ? Math.round(total / count) : 0,
    servicioTop: topServicioRows[0] ? topServicioRows[0].servicio_nombre : null,
    ultimos6Meses: chart.map((r) => ({ mes: r.mes, total: r.total })),
    recientes: recientes.map((r) => ({
      id: r.id,
      cliente: r.cliente_nombre,
      svc: r.servicio_nombre,
      importe: r.precio_final,
      fecha: r.fecha,
      ts: new Date(r.creado_en).getTime(),
    })),
  });
}

module.exports = { resumen };
