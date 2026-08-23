# Encargo para Claude Code — Onpilot H2: backend real (WhatsApp automático)

Depende del encargo H1 (backend real) ya completado — usa la misma base de
autenticación, multi-tenant y modelo de datos de citas/clientes/cobros.

Contexto: `onpilot_system.html` tiene el H2 completo en frontend — pestañas
Conversaciones y Reactivación, con sus funciones JS (`h2Sw`, `h2ShowList`,
`h2ShowChat`, `h2RenderCL`, `h2RenderChat`, `h2Send`, `h2TakeCtrl`, `h2GiveBot`,
`h2RenderRL`, `h2RenderRP`, `h2GoReact`, `h2Skip`, `h2FConvs`) sobre datos
falsos en memoria (conversaciones con `status: 'bot'/'pendiente'/'manual'`,
propuestas de reactivación con tipo, mensaje pre-redactado y coste estimado).
No existe ninguna otra versión más reciente de H2 en ningún repositorio — esta
es la base de partida confirmada.

Este es el módulo core del producto: es lo que justifica "piloto automático".

## 1. Rediseño visual

Aplicar el mismo criterio que en H1, pero en tema oscuro (H2 va oscuro según
el concepto de `onpilot-app-full-product.pdf`): verde `#7ED957`, Space
Grotesk + Manrope, coherente con `onpilot_h3_pagina_web.html` y
`onpilot_h3_kit_google.html` ya construidos.

## 2. Modelo de datos

- `conversaciones`: id, negocio_id, cliente_id (nullable — puede llegar un
  mensaje de un número no reconocido todavía como cliente), telefono, estado
  (bot/pendiente/manual), canal (whatsapp/web — dejar preparado para cuando
  la web de H3 embeba el mismo bot), última_actividad.
- `mensajes`: id, conversacion_id, remitente (bot/cliente/profesional/sistema),
  contenido, timestamp.
- `propuestas_reactivacion`: id, negocio_id, cliente_id, tipo (oferta de
  vuelta/recordatorio/pack descuento/VIP exclusiva), mensaje_sugerido, coste
  estimado, estado (pendiente/enviada/descartada).
- Ampliar `negocios.config_bot` (ya creado en H1) con: nombre del asistente,
  personalidad (tono: cercano/profesional/directo — igual que ya define el
  Documento Técnico), horario de atención, qué puede/no puede gestionar el
  bot, umbral de inactividad para reactivación (default 60 días, mínimo 2
  visitas previas — regla ya definida).

## 3. Integración WhatsApp Cloud API

- Registrar app en Meta for Developers si no existe ya una específica para
  H2 (la app "Onpilot H4" ya creada es para publicación en redes — para
  WhatsApp Business hace falta el producto WhatsApp dentro de una app, puede
  reutilizarse la misma app de Meta si Claude Code lo considera correcto, o
  crear una nueva; decidir y documentar).
- Webhook para mensajes entrantes (`POST /api/webhooks/whatsapp`), verificado
  según el proceso estándar de Meta (token de verificación en `.env`).
- Envío de mensajes salientes vía WhatsApp Cloud API.
- El bot usa Claude Haiku (según el Documento Técnico) con un prompt dinámico
  construido en cada llamada a partir de: nombre/sector/ciudad del negocio,
  tarifario (de H1), horarios, personalidad configurada, instrucciones de
  escalado a humano, instrucción de idioma (detectar y responder en el mismo
  idioma del cliente, incluyendo code-switching), e instrucción de seguridad
  (nunca asesoramiento médico, solo gestión de citas).
- El bot NUNCA promete precios si el profesional no lo ha autorizado
  explícitamente en `config_bot` — regla de negocio ya definida, implementar
  como condición explícita en el prompt y, si es posible, como filtro
  adicional en el backend antes de enviar la respuesta.
- Historial de conversación: limitar a los últimos 10-15 mensajes por llamada
  (Claude no tiene memoria entre llamadas), para controlar coste de tokens.

## 4. Conexión bot ↔ agenda (H1)

- El bot debe poder, dentro de la misma conversación: consultar disponibilidad
  real en `citas` (H1), crear una cita nueva, cancelar o reagendar una
  existente — usando los mismos endpoints de H1, no una copia paralela de la
  lógica de agenda.
- Cuando el bot no puede resolver una consulta en 2 intentos, o el cliente
  pide hablar con una persona, o hay palabras clave de urgencia médica: marcar
  la conversación como `pendiente` y notificar al profesional (mismo patrón
  que ya simula `h2FConvs`).
- El profesional puede tomar control de cualquier conversación
  (`h2TakeCtrl` → estado `manual`, el bot deja de responder) y devolverla al
  bot (`h2GiveBot` → estado `bot`).

## 5. Recordatorios automáticos

- Cola de trabajos programados (Bull + Redis, según el Documento Técnico)
  que, X horas antes de cada cita (configurable: 24h/12h/2h en
  `config_bot`), envía un recordatorio por WhatsApp. El cliente puede
  confirmar o cancelar desde el propio mensaje; la agenda se actualiza en
  consecuencia.

## 6. Motor de reactivación

- Job (puede ser nocturno, vía la misma cola) que cruza `citas` con el umbral
  configurado y genera `propuestas_reactivacion` para clientes inactivos.
- El profesional ve la lista de propuestas (sustituye `h2RenderRL`/
  `h2RenderRP`), puede enviar tal cual, editar antes de enviar, o descartar
  (`h2GoReact`/`h2Skip`) — nunca se envía nada sin aprobación explícita,
  regla de negocio ya definida y aplicada también en H3 para reseñas: mismo
  criterio de "el profesional siempre decide" en todo el producto.
- Al enviar, la propuesta pasa a estado `enviada` y el cliente sale de la
  lista de pendientes (aunque siga apareciendo si vuelve a cumplir el umbral
  más adelante).

## 7. Endpoints

- `GET /api/conversaciones?estado=` (sustituye `h2FConvs`/`h2ShowList`).
- `GET /api/conversaciones/:id/mensajes` (sustituye `h2RenderChat`).
- `POST /api/conversaciones/:id/mensajes` (envío manual del profesional,
  sustituye `h2Send`).
- `PATCH /api/conversaciones/:id/control` (tomar/ceder control, sustituye
  `h2TakeCtrl`/`h2GiveBot`).
- `GET /api/reactivacion/pendientes` (sustituye `h2RenderRL`).
- `POST /api/reactivacion/:id/enviar`, `PATCH /api/reactivacion/:id`
  (editar antes de enviar), `DELETE /api/reactivacion/:id` (descartar).
- `POST /api/webhooks/whatsapp` (entrante, ver punto 3).
- `GET /api/whatsapp/metricas` (recordatorios enviados, tasa de respuesta —
  para la pestaña de métricas ya prevista en el mapa del sistema).

## 8. Notas generales

- No tocar H1 salvo lo estrictamente necesario para consumir sus endpoints
  (agenda, tarifario, clientes) — H2 lee y escribe sobre esos datos, no los
  duplica.
- Comentarios en español.
- Datos de prueba: usar los mismos negocios sembrados en H1 (varios sectores),
  con conversaciones y propuestas de reactivación de ejemplo variadas
  (algunas en `bot`, alguna en `pendiente`, alguna en `manual`) para que la
  demo se vea realista desde el primer momento.
- Al terminar: confirmar qué variables de entorno nuevas hacen falta (token
  de verificación del webhook, credenciales de WhatsApp Cloud API, Redis),
  y probar en real al menos un ciclo completo: mensaje entrante → respuesta
  del bot → cita creada → recordatorio programado.
