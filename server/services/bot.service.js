// Bot de WhatsApp sobre Claude Haiku con tool use: consulta disponibilidad,
// crea y cancela citas reutilizando la misma lógica que el resto del
// sistema (citas.service.js), nunca una copia paralela.
const pool = require('../db/pool');
const { conConfigBot } = require('./configBot.service');
const { historialReciente, guardarMensaje } = require('./conversaciones.service');
const { enviarMensajeWhatsapp } = require('./whatsapp.service');
const { crearCita, cancelarCita, consultarDisponibilidad } = require('./citas.service');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_INTENTOS = 3;

const TOOLS = [
  {
    name: 'consultar_disponibilidad',
    description: 'Consulta las citas ya existentes en una fecha concreta, para saber qué horas evitar antes de proponer una cita.',
    input_schema: {
      type: 'object',
      properties: { fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' } },
      required: ['fecha'],
    },
  },
  {
    name: 'crear_cita',
    description: 'Crea una cita nueva para el cliente de esta conversación.',
    input_schema: {
      type: 'object',
      properties: {
        servicio: { type: 'string', description: 'Nombre del servicio, idealmente igual al del tarifario' },
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        hora: { type: 'string', description: 'HH:MM' },
      },
      required: ['servicio', 'fecha', 'hora'],
    },
  },
  {
    name: 'cancelar_cita',
    description: 'Cancela una cita existente del cliente, dado su id.',
    input_schema: {
      type: 'object',
      properties: { cita_id: { type: 'integer' } },
      required: ['cita_id'],
    },
  },
  {
    name: 'escalar_a_persona',
    description:
      'Marca la conversación como pendiente de atención humana: úsala cuando no puedas resolver la consulta, el cliente pida hablar con una persona, o detectes una urgencia médica.',
    input_schema: {
      type: 'object',
      properties: { motivo: { type: 'string' } },
      required: ['motivo'],
    },
  },
];

const TONOS = {
  cercano: 'cercano y cálido, tuteando al cliente',
  profesional: 'profesional y formal',
  directo: 'directo y breve, sin rodeos',
};

function construirPrompt(negocio, tarifario, config) {
  const listaServicios = tarifario.length
    ? tarifario
        .map(
          (t) =>
            `- ${t.servicio} (${t.categoria}): ${
              config.permite_cotizar_precios ? `${t.precio}€` : 'precio a confirmar'
            }, ${t.duracion_min} min`
        )
        .join('\n')
    : 'Todavía no hay tarifario cargado para este negocio.';

  return `Eres ${config.nombre_asistente}, el asistente de WhatsApp de "${negocio.nombre}" (sector: ${negocio.sector}).
Tu tono es ${TONOS[config.personalidad] || TONOS.cercano}.

SERVICIOS Y TARIFARIO:
${listaServicios}

REGLAS:
- ${
    config.permite_cotizar_precios
      ? 'Puedes indicar los precios del tarifario si te los piden.'
      : 'NUNCA menciones ni confirmes precios — el negocio no lo ha autorizado para el bot. Si preguntan el precio, di que se lo confirmarán al concretar la cita.'
  }
- Para consultar disponibilidad, crear o cancelar una cita usa siempre las herramientas disponibles — nunca digas que hiciste algo sin haber llamado a la herramienta correspondiente.
- Responde siempre en el mismo idioma en el que te escribe el cliente, incluso si mezcla idiomas en el mismo mensaje.
- Nunca des consejo médico, diagnósticos ni indicaciones de salud — solo gestión de citas y dudas generales del negocio.
- Si no consigues resolver la consulta en uno o dos intentos, el cliente pide hablar con una persona, o detectas una urgencia médica, usa la herramienta escalar_a_persona en vez de seguir intentándolo.
- Sé breve y natural, como en una conversación real de WhatsApp — no uses listas ni markdown.`;
}

function colapsarTurnos(mensajes) {
  const out = [];
  for (const m of mensajes) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === m.role && typeof ultimo.content === 'string') {
      ultimo.content += `\n${m.content}`;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

async function llamarClaude(systemPrompt, mensajes) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: mensajes,
      tools: TOOLS,
    }),
  });
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    throw new Error(`Error de la API de Claude: ${res.status} ${cuerpo}`);
  }
  return res.json();
}

async function ejecutarTool(negocioId, conv, bloque) {
  try {
    if (bloque.name === 'consultar_disponibilidad') {
      return await consultarDisponibilidad(negocioId, bloque.input.fecha);
    }
    if (bloque.name === 'crear_cita') {
      if (!conv.cliente_id) {
        return { error: 'No hay un cliente identificado todavía en esta conversación; pide su nombre primero.' };
      }
      return await crearCita(negocioId, {
        cliente_id: conv.cliente_id,
        servicio: bloque.input.servicio,
        fecha: bloque.input.fecha,
        hora: bloque.input.hora,
        canal_reserva: 'WhatsApp',
      });
    }
    if (bloque.name === 'cancelar_cita') {
      return await cancelarCita(negocioId, bloque.input.cita_id);
    }
    return { error: 'Herramienta desconocida' };
  } catch (err) {
    return { error: err.message };
  }
}

async function marcarPendiente(conversacionId, motivo) {
  await pool.query(`UPDATE conversaciones SET estado = 'pendiente', ultima_actividad = now() WHERE id = $1`, [
    conversacionId,
  ]);
  await guardarMensaje(conversacionId, 'sistema', `Conversación escalada a una persona: ${motivo}`);
}

// Genera (y envía por WhatsApp) la respuesta del bot al último mensaje del
// cliente en una conversación. No devuelve nada: persiste todo en BD.
async function responderComoBot(negocioId, conversacionId) {
  const { rows: negRows } = await pool.query('SELECT * FROM negocios WHERE id = $1', [negocioId]);
  const { rows: convRows } = await pool.query('SELECT * FROM conversaciones WHERE id = $1', [conversacionId]);
  const negocio = negRows[0];
  const conv = convRows[0];
  if (!negocio || !conv) return;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY no configurada — el bot no puede responder');
    await marcarPendiente(conversacionId, 'el bot no está configurado (falta ANTHROPIC_API_KEY)');
    return;
  }

  const { rows: tarifarioRows } = await pool.query(
    'SELECT servicio, categoria, precio, duracion_min FROM tarifario WHERE negocio_id = $1 AND activo = true',
    [negocioId]
  );
  const config = conConfigBot(negocio.config_bot);
  const systemPrompt = construirPrompt(negocio, tarifarioRows, config);

  const historial = await historialReciente(conversacionId, 15);
  let mensajes = colapsarTurnos(
    historial.map((m) => ({
      role: m.remitente === 'cliente' ? 'user' : 'assistant',
      content: m.contenido,
    }))
  );

  async function enviarYGuardarRespuesta(texto) {
    await guardarMensaje(conversacionId, 'bot', texto);
    if (conv.canal === 'whatsapp' && negocio.whatsapp_phone_number_id) {
      await enviarMensajeWhatsapp(negocio.whatsapp_phone_number_id, conv.telefono, texto);
    }
  }

  try {
    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const respuesta = await llamarClaude(systemPrompt, mensajes);
      const bloques = respuesta.content || [];
      const texto = bloques
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      const bloqueTool = bloques.find((b) => b.type === 'tool_use');

      if (!bloqueTool) {
        if (texto) await enviarYGuardarRespuesta(texto);
        return;
      }

      if (bloqueTool.name === 'escalar_a_persona') {
        if (texto) await enviarYGuardarRespuesta(texto);
        await marcarPendiente(conversacionId, bloqueTool.input.motivo || 'sin motivo especificado');
        return;
      }

      const resultadoTool = await ejecutarTool(negocioId, conv, bloqueTool);
      mensajes.push({ role: 'assistant', content: bloques });
      mensajes.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: bloqueTool.id, content: JSON.stringify(resultadoTool) }],
      });
    }
    // Se agotaron los intentos sin una respuesta final: escalar.
    await marcarPendiente(conversacionId, 'el bot no pudo resolverlo en varios intentos');
  } catch (err) {
    console.error('Error del bot respondiendo:', err);
    await marcarPendiente(conversacionId, 'error técnico del bot').catch(() => {});
  }
}

module.exports = { responderComoBot, construirPrompt };
