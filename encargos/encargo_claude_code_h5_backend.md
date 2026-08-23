# Encargo para Claude Code — Onpilot H5: backend real (panel de control)

Depende de H1 (agenda/cobros) y H2 (conversaciones/reactivación) ya con
backend real — H5 no genera datos propios, solo los cruza y visualiza.

Contexto: `onpilot_system.html` tiene el H5 completo en frontend (`h5Init`,
`h5RenderAll`, `h5SetPeriodo`, `h5ToggleComparar`, `h5RenderLineChart`,
`h5RenderDonut`, `h5RenderSparkline`, `h5FormatEur`, selector de comparativa
con rango personalizado) sobre datos falsos generados en JS. Es el módulo más
sencillo de los cinco porque no crea datos nuevos — solo consulta y agrega lo
que ya existe en H1 y H2.

## 1. Rediseño visual

Mismo criterio que H2: tema oscuro, verde `#7ED957`, Space Grotesk + Manrope,
coherente con el resto del sistema ya rediseñado.

## 2. KPIs y su fuente real (según el Documento Técnico, sección 3.4)

Todos deben calcularse con SQL/agregados reales sobre las tablas de H1 y H2,
nunca con datos generados en el frontend:

- Facturación del período → suma de `cobros.precio_final`.
- Citas realizadas → `citas` con estado `cobrada` en el período.
- Ticket medio → facturación / nº citas cobradas.
- Clientes nuevos → clientes con primera cita en el período.
- Clientes recurrentes → clientes con más de 1 cita en el período.
- Tasa de retención → % de clientes que repiten en 90 días.
- Mensajes del bot resueltos → % de conversaciones de H2 que no llegaron a
  estado `pendiente`/escalado.
- Rendimiento de posts (si H4 ya está conectado) → métricas de Meta Graph
  API ya obtenidas en H4, mostradas aquí agregadas, no vueltas a pedir.

## 3. Endpoints

- `GET /api/dashboard?periodo=hoy|semana|mes|trimestre|anio|anterior` (y
  soporte de rango personalizado `desde`/`hasta`, sustituye
  `h5SetPeriodo`/`h5OpenCmpSelector`/`h5ApplyCustomCmp`) — devuelve todos los
  KPIs de una vez para el período pedido.
- El mismo endpoint debe aceptar un segundo período de comparación
  (`comparar_desde`/`comparar_hasta`) para la doble curva del gráfico de
  líneas (sustituye `h5ToggleComparar`).
- `GET /api/dashboard/top-servicios` (barras horizontales, top 5).
- `GET /api/dashboard/alertas` (ver punto 4).

## 4. Sistema de alertas automáticas (Documento Técnico, sección 3.5)

Estas alertas son transversales — se calculan cruzando H1 y H2, no son datos
propios de H5:

- Clientes a reactivar: N clientes sin visita en X días (mismo umbral
  configurado en `config_bot` de H2).
- WhatsApp pendiente: conversación sin respuesta del bot en más de 2h.
- Bot con alta tasa de escalado: más del 30% de conversaciones escaladas en
  los últimos 7 días.
- Cliente VIP candidato: cliente con más de 6 visitas sin descuento VIP
  activo.
- Citas canceladas en aumento: más del 20% de cancelaciones esta semana
  frente a la media.
- Sin publicar en redes (si H4 conectado): N días sin ningún post publicado
  ni programado.

Cada alerta debe incluir una acción sugerida que enlace al módulo
correspondiente (H1, H2 o H4) — mismo patrón que ya define el Documento
Técnico, no solo mostrar el aviso sin acción.

## 5. Frontend

- Sustituir los datos simulados en `h5RenderAll` y funciones asociadas por
  `fetch` al endpoint de dashboard. Mantener los nombres de función.
- Los gráficos SVG ya construidos (`h5RenderLineChart`, `h5RenderDonut`,
  `h5RenderSparkline`) se quedan igual en su lógica de dibujo — solo cambia
  de dónde sacan los números.

## 6. Notas generales

- No duplicar cálculos que ya existan en H1/H2 (ej. facturación) — H5 solo
  consulta y agrega, no reimplementa lógica de negocio.
- Comentarios en español.
- Al terminar: confirmar que los KPIs mostrados coinciden exactamente con los
  datos reales de H1/H2 para los negocios de prueba ya sembrados (verificar
  al menos un cálculo a mano, ej. facturación del mes, contra la suma real
  de cobros en la base de datos).
