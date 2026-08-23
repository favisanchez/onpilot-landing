# Encargo para Claude Code — Onpilot H6: Ficha de Google

Nuevo módulo, independiente de H3. Solución puente manual — no hay integración
por API en esta v1 porque Google exige aprobación de proyecto (Onpilot) y una
ficha con más de 60 días de antigüedad y verificada (por negocio cliente) antes
de permitir conexión automática. Ninguna de las dos condiciones está resuelta
hoy, así que en v1 el kit manual se muestra a todos los negocios por igual.

Referencia visual ya entregada y validada: `onpilot_h3_kit_google.html`
(3 pantallas: aviso en el dashboard, kit de contenido, confirmación).

## 1. Qué es H6 en v1

Un generador de contenido listo para que el profesional lo copie y pegue en su
propia ficha de Google Business Profile — no publica nada automáticamente.
Es explícitamente una tarea puntual del onboarding, no una gestión recurrente.

## 2. Contenido del kit (generado, no escrito a mano)

A partir de los datos que Onpilot ya tiene del negocio (H1: horarios,
tarifario; H4: perfil de negocio y tono; imágenes ya subidas o de Pexels):

- Descripción del negocio (texto redactado, no una plantilla vacía).
- Categoría sugerida según el sector del negocio.
- Horario, ya formateado tal como Google lo pide.
- 3-4 fotos sugeridas, descargables en un clic, priorizando imágenes propias
  del negocio si existen, o de Pexels si no.
- Cada campo tiene un botón "Copiar" individual (no un botón único que copie
  todo el bloque, para que el profesional pueda pegar campo a campo en el
  formulario real de Google).

## 3. Flujo y visibilidad

- Aviso no intrusivo en el Dashboard (tarjeta tipo alerta ámbar, igual que las
  alertas ya existentes del sistema de H5), NO un modal bloqueante.
- Al entrar al kit: contenido ya generado, botón "Abrir mi ficha de Google ↗"
  (enlace directo a business.google.com) y botón "Lo haré más tarde" con la
  misma jerarquía visual que cualquier acción pospuesta en el resto del
  sistema.
- Al marcarlo como hecho: pantalla de confirmación con un toggle "Avisarme si
  algo cambia" (para que, si el profesional actualiza horarios o tarifario más
  adelante, Onpilot le avise de que el kit quedó desactualizado y toca volver
  a copiarlo — no que Onpilot lo detecte y lo vuelva a mostrar sin más).
- Onpilot NO vuelve a insistir con este aviso una vez completado, salvo que se
  dispare esa actualización.

## 4. Regla de visibilidad del módulo completo

H6 solo se muestra en negocios que NO tengan conexión automática activa con
Google. En v1 esto equivale a todos los negocios, porque la conexión
automática todavía no existe. Implementar la condición como un flag
(`google_conectado: bool`, default `false`) y no como "todos" a fuego, para que
cuando en el futuro se active la integración por API, baste con poner ese flag
a `true` en los negocios que cumplan las dos condiciones (Onpilot aprobado +
ficha del negocio con más de 60 días) y el kit manual deje de mostrarse a esos
negocios sin tocar el resto de la lógica.

## 5. Pendiente — NO construir en esta v1, dejar solo el flag preparado

- Conexión automática vía Business Profile API de Google (gestión de ficha +
  métricas de rendimiento — impresiones, clics a la web, llamadas, solicitudes
  de cómo llegar). Bloqueada por aprobación manual de Google, que a su vez
  requiere que Onpilot tenga web corporativa propia, política de privacidad y
  dominio propio — ninguno de los tres existe todavía.
- Cuando se resuelva lo anterior: solicitar el acceso a la API cuanto antes
  (el proceso de aprobación de Google puede tardar semanas), en paralelo al
  resto del desarrollo, no al final.

## 6. Notas generales

- No tocar H3, H1, H2, H4 ni H5 — H6 solo lee de sus datos.
- Comentarios en español, en línea con el resto del proyecto.
- Al terminar, confirmar que el flag `google_conectado` existe y que el aviso
  del Dashboard respeta ese flag.
