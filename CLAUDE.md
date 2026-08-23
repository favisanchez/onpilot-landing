# Onpilot — contexto del proyecto

Sistema operativo para negocios locales de servicios (salud, estética,
fisioterapia). Seis módulos: H1 (agenda), H2 (WhatsApp), H3 (página web),
H4 (contenido redes), H5 (panel de control), H6 (ficha de Google).

## Stack
- Todo el sistema en Node.js + Express + PostgreSQL, un solo lenguaje.
- H4 empezó en Flask (Python) con publicaciones reales ya probadas en
  Instagram/Facebook — se migra a Node conservando la misma lógica.
- IA: Claude API (Haiku para el bot, Sonnet para contenido/copy)
- WhatsApp: Cloud API directa de Meta (sin BSP intermediario)

## Estado actual
H1 (agenda y clientes) completado: backend real en Node/Express + PostgreSQL
con auth (JWT access + refresh token rotado en cookie httpOnly), multi-tenant
(`negocio_id` en todas las tablas), endpoints de clientes/citas/cobros/
tarifario/caja/negocio, y `onpilot_agenda.html` (movido a `public/`) rewireado
a la API real conservando todos los nombres de función originales. Rediseño
visual aplicado (verde `#7ED957`, Space Grotesk + Manrope, iconos Tabler
intactos). 4 negocios demo sembrados (fisioterapia, estética, nutrición,
entrenador personal), password `demo1234` para todos. Ver
`server/` para el código del backend y `public/onpilot_login.html` para el
login/registro. Probado manualmente en desktop y móvil (login, cobro con
descuento VIP, edición de cliente/tarifario, importación CSV, caja, semana de
agenda) y persistencia confirmada tras reiniciar el servidor.

`registro_permisos` completado: el registro exige checkbox de Términos de
Uso/Política de Privacidad (`public/terminos.html`, `public/privacidad.html`,
placeholders marcados como borrador legal), validado en frontend y backend
(`acepta_terminos` en `POST /api/auth/registro`, rechaza con 400 si falta).
Cada negocio guarda `terminos_version`/`terminos_aceptados_en` en `negocios`
(migración `002_terminos.sql`, versión vigente en `server/config/legal.js`) —
mecanismo de re-aceptación futuro preparado pero no activo en esta v1.
Verificado que el registro no se puede completar sin aceptar (frontend y
backend por separado) y que los negocios demo de H1 siguen pudiendo iniciar
sesión sin problema. Permisos de cámara/micrófono quedan documentados como
convención para cuando se construyan H3/H4 (no hay ningún punto de la app
hoy que los necesite); la importación de clientes de H1 ya usaba el selector
de archivo nativo, sin cambios.

Ampliación de registro completada: catálogo de sectores ampliado a 10 fijos +
"Otro" (`public/onpilot_login.html`). Si el negocio elige "Otro", el registro
exige descripción libre + URL (validada con `URL` nativo, normalizando el
protocolo si falta) y la cuenta se crea con `estado='pendiente_revision'` en
vez de `'activo'` (migración `003_negocios_otro.sql`) — ni el registro ni el
login emiten sesión para una cuenta pendiente; en su lugar la API devuelve
`{pendiente:true, negocio}` y el frontend muestra una pantalla explicando que
está pendiente de revisión, sin acceso a la app. Al crearse, se envía un
aviso por email a `ADMIN_EMAIL` (`server/services/email.service.js`, vía
Resend) con nombre, descripción, enlace y contacto del negocio.

**Activar una cuenta pendiente a mano** (no hay backoffice todavía):
```sql
UPDATE negocios SET estado = 'activo' WHERE email = '<email-del-negocio>';
```

**Aviso sobre Resend**: la cuenta usada es de prueba (sin dominio verificado
en resend.com/domains), así que solo puede enviar a la dirección dueña de la
API key. `ADMIN_EMAIL` está fijado a `favi.sanchez@hotmail.com` por eso
mismo (confirmado con un envío real que llegó correctamente); usar cualquier
otra dirección ahí falla con 403 hasta verificar un dominio.

H2 (WhatsApp automático) completado: backend real en `conversaciones`/
`mensajes`/`propuestas_reactivacion` (migración `004_h2_whatsapp.sql`),
endpoints de conversaciones/reactivación/webhook/métricas, bot sobre Claude
Haiku con tool use (`server/services/bot.service.js`: `consultar_disponibilidad`,
`crear_cita`, `cancelar_cita`, `escalar_a_persona` — reutiliza
`server/services/citas.service.js`, la misma lógica que usa H1, nunca una
copia paralela), recordatorios y motor de reactivación con `node-cron` (sin
Redis/Bull, decisión tomada contigo por la fricción de instalar Redis en
Windows para el volumen de un piloto). `public/onpilot_system.html` (movido
desde la raíz, comparte archivo con H4/H5 — **ambos fuera de alcance, sin
tocar**) rewireado función por función (`h2*`), con el mismo gate de sesión
que `onpilot_agenda.html`. Rediseño oscuro aplicado con variables CSS
redefinidas dentro de `#view-h2` (mismo truco que evita duplicar reglas y
garantiza que H4/H5 no se tocan, ya que las variables no cruzan hacia
afuera de ese contenedor). De paso, arreglé un bug preexistente del mockup
(`.mobile-hidden` se usaba en JS pero nunca estaba definida en CSS — sin
eso, lista y chat se veían a la vez en móvil).

**Probado en real, no solo simulado**: ciclo completo mensaje→bot→cita
verificado con Claude respondiendo de verdad (cliente pide cita → bot
consulta disponibilidad → bot crea la cita real en `citas`); escalado a
persona probado con un mensaje de urgencia médica (el bot nunca da consejo
médico y escala correctamente); envío/edición/descarte de propuestas de
reactivación probado end-to-end, incluyendo que al enviar o descartar una
propuesta las demás alternativas del mismo cliente se resuelven también
(el cliente sale de la lista de pendientes, tal como pide el encargo).
**Lo único que falta probar de verdad es el envío/recepción real por
WhatsApp** (`server/services/whatsapp.service.js`) — necesita credenciales
de Meta que Favián todavía no tiene; el código está listo (envío vía Graph
API, verificación de firma HMAC del webhook), solo pendiente de las
credenciales reales. Ver la sección siguiente.

### Pendiente: conectar WhatsApp Cloud API de verdad

Variables en `.env` (documentadas en `.env.example`) que faltan por rellenar
con datos reales de Meta: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`.
`WHATSAPP_VERIFY_TOKEN` ya tiene un valor generado, no hace falta tocarlo.

Pasos en [Meta for Developers](https://developers.facebook.com/):
1. Crear una app tipo "Business" (o reutilizar la app "Onpilot H4" ya
   creada para redes, si se prefiere una sola app — decisión pendiente de
   Favián; técnicamente funciona igual).
2. Añadir el producto **WhatsApp** a la app.
3. En la configuración de WhatsApp → "API Setup": copiar el **número de
   prueba** (test number) que Meta da gratis, su **Phone number ID**, y
   generar un **token de acceso temporal** (o uno permanente vía un System
   User, para que no caduque en 24h).
4. Copiar el **App Secret** desde Configuración básica de la app → eso es
   `WHATSAPP_APP_SECRET`.
5. En "Configuration" → Webhooks: la URL del webhook es
   `https://<tu-túnel-público>/api/webhooks/whatsapp` y el "Verify Token"
   es el valor ya puesto en `WHATSAPP_VERIFY_TOKEN` — como en local no hay
   HTTPS público, hace falta un túnel (ngrok o similar, igual que se hizo
   para H4) apuntando al puerto 3000.
6. Suscribirse al campo `messages` del webhook.
7. Guardar `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_APP_SECRET` en `.env`, y
   ejecutar este SQL para vincular el número de prueba a un negocio demo:
   ```sql
   UPDATE negocios SET whatsapp_phone_number_id = '<phone_number_id>' WHERE email = 'demo.estetica@onpilot.app';
   ```
8. Añadir tu propio número de WhatsApp como "número de prueba destinatario"
   en el panel de Meta (los números de prueba solo pueden escribir a
   números explícitamente autorizados), y mandarle un mensaje al número de
   Onpilot para probar el ciclo completo real.

## Pendientes
- **Conectar WhatsApp Cloud API de verdad** — ver sección de arriba.
- **Dominio corporativo de Onpilot**: en cuanto exista, verificarlo en
  resend.com/domains y cambiar `ADMIN_EMAIL` (en `.env`) al email
  definitivo del equipo (p.ej. `hola@` o `avisos@` el dominio nuevo) — hoy
  está en `favi.sanchez@hotmail.com` solo porque la cuenta de Resend está en
  modo sandbox sin dominio propio.

Siguiente paso sugerido: cuando WhatsApp esté conectado de verdad y se haya
probado el ciclo completo, `encargo_claude_code_texto_imagen.md` (H4) o
`encargo_claude_code_h3_pagina_web.md`, según el orden que prefieras.
(Actualizar esta sección después de cada encargo completado.)

## Reglas de negocio que no se tocan sin confirmarlo antes
- El profesional siempre decide — el bot nunca envía nada automáticamente
  sin aprobación (reactivación, reseñas, publicaciones).
- Un cobro no se puede eliminar, solo marcar como error con nota.
- No se pueden crear citas en fechas pasadas.
- Verde de marca: #7ED957. Tipografías: Space Grotesk (títulos) + Manrope
  (texto). H1 y la web pública del cliente van en tema claro; H2, H4, H5,
  H6 van en tema oscuro.

## Dónde están los encargos
Todos los encargos técnicos y las maquetas de referencia visual están en
la carpeta /encargos, en el orden en que deben pasarse a Claude Code.