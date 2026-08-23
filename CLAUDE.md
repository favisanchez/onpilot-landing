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

## Pendientes
- **Dominio corporativo de Onpilot**: en cuanto exista, verificarlo en
  resend.com/domains y cambiar `ADMIN_EMAIL` (en `.env`) al email
  definitivo del equipo (p.ej. `hola@` o `avisos@` el dominio nuevo) — hoy
  está en `favi.sanchez@hotmail.com` solo porque la cuenta de Resend está en
  modo sandbox sin dominio propio.

Siguiente paso sugerido: `encargo_claude_code_h2_backend.md`.
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