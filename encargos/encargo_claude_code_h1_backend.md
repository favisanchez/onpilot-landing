# Encargo para Claude Code — Onpilot H1: backend real (agenda y clientes)

**Revisión importante**: este encargo sustituye cualquier versión anterior basada
en `onpilot_system.html`. La base correcta de H1 es `onpilot_agenda.html`
(repositorio `favisanchez/onpilot-landing`), que tiene más funcionalidad (pestaña
de Tarifario que la otra versión no tenía) y una estructura responsive real
(desktop + móvil en un solo archivo con media queries, no maqueta de teléfono).

Contexto: `onpilot_agenda.html` ya tiene el H1 completo en frontend — pestañas
Agenda/Ficha del cliente/Tarifario/Importar clientes/Cierre de caja, versión
desktop (prefijo de función/id `d-`) y versión móvil (prefijo `m-`) en el mismo
archivo, activadas por media query. Todo funciona hoy sobre datos falsos en
memoria (`var clients=[...]`, `var agendaData={...}`, `var tarifario=[...]`)
que desaparecen al recargar la página.

**Objetivo de este encargo**: sustituir esos datos falsos por un backend real
con base de datos, sin rehacer el frontend salvo el rediseño visual del punto 2.
Este es el primer encargo de backend real del proyecto — establece la base
(auth, BD, multi-tenant) sobre la que se construirá H2 a continuación.

## 1. Rediseño visual — aplicar antes o junto con la conexión al backend

El sistema visual actual de `onpilot_agenda.html` (fondo `#F5F5F0`, verde
`#1D9E75`, tipografía DM Sans, iconos Tabler) queda sustituido por el sistema
de marca real de Onpilot:

- Verde de marca: `#7ED957` (sustituye todas las apariciones de `#1D9E75`,
  `#085041`, `#0F6E56` y variantes derivadas del verde antiguo).
- Tipografía: Space Grotesk para títulos/cifras destacadas, Manrope para el
  resto — mismo criterio que ya se usó en los mockups de H3/H6
  (`onpilot_h3_pagina_web.html`, `onpilot_h3_kit_google.html`), disponibles
  como referencia visual.
- H1 mantiene fondo claro (coherente con el concepto de
  `onpilot-app-full-product.pdf`, donde H1 aparece en tema claro mientras H2,
  H4 y H5 van en tema oscuro) — no oscurecer H1.
- No es necesario tocar iconos Tabler si funcionan bien — evaluar si conviene
  sustituirlos por SVG stroke propios (como en H3/H6) para consistencia total,
  decisión de Claude Code según lo que sea más rápido sin romper nada.

## 2. Setup del proyecto

- Backend: Node.js + Express (decisión de stack ya tomada en el Documento
  Técnico). Base de datos: PostgreSQL. Railway como hosting cuando se decida
  desplegar — en esta fase corre en local (equipo de Favián) expuesto por
  ngrok o similar, igual que se hizo con H4.
- Servir `onpilot_agenda.html` y sus assets desde el propio backend Express.

## 3. Autenticación y multi-tenant

- Registro y login de negocio (email + contraseña). JWT + refresh token.
- Cada negocio registrado = un tenant. Todas las tablas llevan `negocio_id`,
  aislamiento total entre negocios.
- Formulario de registro simple — el objetivo es tener varios negocios de
  prueba funcionando (ver punto 6), no un onboarding público pulido todavía.

## 4. Modelo de datos

- `negocios`: id, nombre, sector, teléfono, email, horarios, config_bot (JSON,
  campo preparado para H2 aunque no se use todavía).
- `clientes`: id, negocio_id, nombre, teléfono, email, fecha_alta (`since`),
  vip (bool), descuento_vip (`vipDto`), notas (con autoguardado — mantener el
  mismo debounce de 800ms que ya usan `dSaveNota`/`mSaveNota`).
- `tarifario`: id, negocio_id, servicio, categoría, precio, duración —
  sustituye el array `tarifario` fijo. Editable desde la pestaña Tarifario
  (sustituye `dSaveTar`/`dEditTar`).
- `citas`: id, negocio_id, cliente_id, fecha, hora, servicio, canal_reserva
  (`origen`: WhatsApp/Teléfono/En el negocio/Email), estado
  (confirmada/cobrada/cancelada). Sustituye `agendaData` y el array
  `proximas` embebido en cada cliente — pasan a ser una sola tabla consultada
  por negocio y rango de fechas, no datos duplicados en dos sitios.
- `cobros`: id, negocio_id, cliente_id, cita_id, fecha, servicio, precio_base,
  dto_vip, dto_adicional, precio_final. No se puede eliminar un cobro, solo
  marcar como error con nota — mantener esta regla ya definida.

## 5. Endpoints (sustituyen la simulación JS actual)

- `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refresh`.
- `GET /api/clientes` (con búsqueda — sustituye `dFilterClients`/
  `mFilterClients`), `GET /api/clientes/:id`, `PATCH /api/clientes/:id`
  (sustituye `dSaveEdit`, `dToggleVip`, `dSaveVD`, `dSaveNota` y sus
  equivalentes móviles), `POST /api/clientes/importar`.
- `GET /api/citas?semana=` (sustituye `agendaData` + navegación de semana con
  `dChWeek`/`mChWeek`), `POST /api/citas` (sustituye `dSaveAppt`/`mSaveAppt`),
  `PATCH /api/citas/:id` (cancelar — sustituye `dCancelAppt`/`dCancelFx`).
  Regla ya definida: no se pueden crear citas en fechas pasadas.
- `POST /api/cobros` (sustituye `dConfirmCob`/`dConfirmFx` y sus equivalentes
  móviles — aplica descuento VIP automático + descuento adicional manual,
  actualiza estado de la cita, historial del cliente, visitas y gasto total
  en una sola transacción).
- `GET /api/tarifario`, `POST /api/tarifario`, `PATCH /api/tarifario/:id`
  (sustituye el array fijo y `dSaveTar`).
- `GET /api/caja?periodo=dia|semana|mes|anio` (sustituye `dRenderCaja`/
  `getAllTx` — agregados de facturación, ticket medio, servicio top, gráfico
  de últimos 6 meses).
- `GET /api/negocio`, `PATCH /api/negocio`.

## 6. Frontend — cambios mínimos de lógica, además del rediseño del punto 1

- Sustituir las asignaciones directas a `clients`/`agendaData`/`tarifario` en
  memoria por `fetch` a los endpoints de arriba. Mantener los nombres de
  función existentes donde sea razonable (`dRenderSidebar`, `dSaveEdit`,
  `mSaveAppt`, etc. deben seguir llamándose igual desde los `onclick`/
  `oninput` ya presentes en el HTML — cambia lo que hacen por dentro).
- Los tags automáticos (VIP, Nueva ≤1 visita, Reactivar >1 visita sin VIP,
  ya calculados en `computeTags()`) deben calcularse en el backend a partir
  de datos reales, la función del frontend pasa a solo pintar lo que
  devuelve la API.

## 7. Datos de prueba — varios negocios, no uno solo

Sembrar varios negocios de ejemplo de sectores distintos a los que Onpilot
puede servir (fisioterapia, estética/belleza, nutrición, entrenador personal —
coherente con el catálogo ya definido en H4), cada uno con 10-15 clientes de
historial variado (algunos VIP, algunos nuevos, alguno con más de 60 días sin
visita), para poder mostrar una demo realista según a qué tipo de negocio se
le esté enseñando Onpilot.

## 8. Notas generales

- No construir H2 en este encargo — pero dejar `config_bot` en `negocios` y
  el estado de citas/cobros ya preparados, porque H2 depende de leer y
  escribir sobre estos mismos datos (ver encargo H2 aparte).
- Comentarios en español.
- Al terminar: cómo levantar el proyecto en local (variables de entorno,
  comando de arranque), confirmación de que los datos sobreviven a un
  reinicio del servidor, y confirmación de que el rediseño visual (punto 1)
  no rompió ninguna interacción existente (probar cobro, edición de cliente,
  importación, tarifario, en desktop y móvil).
