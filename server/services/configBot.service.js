// Forma esperada de negocios.config_bot (JSONB, ya existe desde H1). No
// necesita migración: este módulo documenta los valores por defecto y los
// combina con lo que el negocio haya configurado, para que el resto del
// código (prompt del bot, jobs de recordatorios/reactivación) siempre lea
// un objeto completo aunque el negocio no haya tocado su configuración.
const DEFAULTS = {
  nombre_asistente: 'Asistente',
  personalidad: 'cercano', // cercano | profesional | directo
  horario_atencion: {},
  puede_gestionar: ['agenda'], // qué puede gestionar el bot (agenda, precios, etc.)
  umbral_inactividad_dias: 60,
  minimo_visitas_reactivacion: 2,
  permite_cotizar_precios: false,
  recordatorios_horas_antes: [24, 12, 2],
};

function conConfigBot(configBotGuardado) {
  return { ...DEFAULTS, ...(configBotGuardado || {}) };
}

module.exports = { DEFAULTS, conConfigBot };
