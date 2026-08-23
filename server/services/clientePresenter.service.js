// Da forma a las filas de "clientes" tal como las espera el frontend
// (mismos nombres de campo que usaba el array "clients" en memoria:
// name, init, ci, phone, since, vipDto, gasto, ultima, nota...).
const { computeTags } = require('./tags.service');
const { todayISODate, toISODate } = require('../utils/dates');

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function initials(nombre) {
  const partes = String(nombre).trim().split(/\s+/);
  const a = partes[0] ? partes[0][0] : '';
  const b = partes[1] ? partes[1][0] : '';
  return (a + b).toUpperCase();
}

function fechaISOaPartes(fecha) {
  // "fecha" puede llegar como Date (driver pg) o como string "YYYY-MM-DD".
  const iso = fecha instanceof Date ? fecha.toISOString().slice(0, 10) : String(fecha);
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function formatMesAnio(fecha) {
  if (!fecha) return '';
  const { y, m } = fechaISOaPartes(fecha);
  return `${MESES[m - 1]} ${y}`;
}

function formatUltima(fecha) {
  if (!fecha) return 'Nunca';
  const { y, m, d } = fechaISOaPartes(fecha);
  const fechaStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (fechaStr === todayISODate()) return 'Hoy';
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (fechaStr === toISODate(ayer)) return 'Ayer';
  return `${d} ${MESES_ABR[m - 1]} ${y}`;
}

// Forma "lista" (usada en el sidebar/búsqueda) — sin próximas citas ni historial.
function toListaShape(row) {
  const tags = computeTags({ vip: row.vip, visitas: row.visitas });
  return {
    id: row.id,
    name: row.nombre,
    init: initials(row.nombre),
    ci: row.avatar_color_idx,
    phone: row.telefono,
    email: row.email,
    since: formatMesAnio(row.fecha_alta),
    vip: row.vip,
    vipDto: row.descuento_vip,
    visitas: row.visitas,
    gasto: row.gasto_total,
    ultima: formatUltima(row.ultima_visita),
    nota: row.notas,
    tags,
  };
}

module.exports = { initials, formatMesAnio, formatUltima, toListaShape };
