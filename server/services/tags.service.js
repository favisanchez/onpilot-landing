// Calcula los tags automáticos de un cliente (antes calculados en el
// frontend por computeTags(); ahora los calcula el backend y el frontend
// solo pinta lo que recibe). Reglas iguales a las del encargo original:
// VIP, Nueva (<=1 visita), Reactivar (>1 visita y no VIP).
function computeTags(cliente) {
  const tags = [];
  if (cliente.vip) tags.push('VIP');
  if (cliente.visitas <= 1) tags.push('Nueva');
  else if (!cliente.vip) tags.push('Reactivar');
  return tags;
}

module.exports = { computeTags };
