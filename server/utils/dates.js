// Helpers de fechas en formato YYYY-MM-DD (el formato que usa Postgres DATE
// y el que viaja en las queries de la API), evitando líos de zona horaria
// al trabajar solo con año/mes/día.

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayISODate() {
  return toISODate(new Date());
}

// true si fechaStr (YYYY-MM-DD) es anterior al día de hoy.
function isPastDate(fechaStr) {
  return fechaStr < todayISODate();
}

// Lunes (índice 0) de la semana ISO a la que pertenece fechaStr (YYYY-MM-DD).
function mondayOf(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0=domingo .. 6=sábado
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diffToMonday);
  return toISODate(date);
}

// Array de 7 fechas YYYY-MM-DD empezando en el lunes dado (índice 0..6, Mon..Sun).
function weekDates(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    out.push(toISODate(dt));
  }
  return out;
}

module.exports = { toISODate, todayISODate, isPastDate, mondayOf, weekDates };
