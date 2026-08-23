// Da forma a las conversaciones tal como las espera el frontend (mismos
// nombres de campo que usaba el array "conversations" en memoria: name,
// init, ci, phone, status, unread, lastMsg, time).
function initials(nombre) {
  const partes = String(nombre).trim().split(/\s+/);
  const a = partes[0] ? partes[0][0] : '';
  const b = partes[1] ? partes[1][0] : '';
  return (a + b).toUpperCase();
}

function tiempoRelativo(fecha) {
  const ms = Date.now() - new Date(fecha).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} d`;
}

// row: fila de "conversaciones" con columnas extra del JOIN (cliente_nombre,
// cliente_ci, ultimo_mensaje, ultimo_remitente).
function toConversacionShape(row) {
  const nombre = row.cliente_nombre || row.telefono;
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    name: nombre,
    init: initials(nombre),
    ci: row.cliente_ci ?? 0,
    phone: row.telefono,
    status: row.estado,
    canal: row.canal,
    // "No leída" = el último mensaje es del cliente y nadie (bot o
    // profesional) le ha respondido todavía.
    unread: row.ultimo_remitente === 'cliente',
    lastMsg: row.ultimo_mensaje || '',
    time: row.ultima_actividad ? tiempoRelativo(row.ultima_actividad) : '',
  };
}

module.exports = { initials, tiempoRelativo, toConversacionShape };
