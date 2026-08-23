# Encargo para Claude Code — Onpilot H3: Página web

Nuevo módulo. No existía funcionalidad previa que tocar — es la primera versión.
Depende de datos ya existentes en H1 (tarifario, horarios) y H2 (bot), y opcionalmente
de imágenes ya subidas o generadas en H4.

## 1. Qué es H3

Un generador de página web pública para el negocio, editable por bloques, con el
bot de H2 embebido como widget de chat. El profesional no diseña desde cero: la
web se genera con los datos que Onpilot ya tiene del negocio, y solo ajusta lo
esencial (colores, textos, qué destacar).

Referencia de mercado (Bewe "Página web"): web conversacional, editor por
bloques, publicación en segundos, subdominio propio, SEO básico, catálogo
siempre sincronizado con el tarifario real. Onpilot debe igualar esto y añadir:
generación de copy con IA (no solo relleno de datos), reutilización de contenido
ya publicado en H4, reseñas moderadas, personalización de estilo por el cliente
(no solo del profesional que usa Onpilot — el negocio final decide su propio
aspecto dentro de la plantilla).

## 2. Estructura de datos

- `Negocio.web`: `{ subdominio, estado (borrador/publicada), tema (colores + fuente
  elegidos), bloques[], version_actual, historial_versiones[] }`.
- `Bloque`: `{ id, tipo (hero/servicios/galeria/resenas/contacto/custom), orden,
  contenido, visible (bool) }`.
- El bloque `servicios` NO almacena su propio contenido — lee en tiempo real de
  `Negocio.tarifario` (H1). Cambios en H1 se reflejan en la web sin que el
  profesional toque nada.
- El bloque `galeria` puede poblarse con imágenes propias subidas, imágenes de
  Pexels ya usadas en H4, o imágenes de posts publicados que el profesional
  marque explícitamente para la web (ver punto 5).

## 3. Editor por bloques (frontend)

- Bloques disponibles en v1: Portada (hero), Servicios, Galería, Reseñas,
  Contacto y horario. Reordenables por el profesional (drag) y ocultables
  individualmente (toggle visible/oculto), nunca eliminables de raíz —
  ocultar, no borrar, para poder reactivar sin reconfigurar.
- **Personalización de estilo, no solo de contenido**: el negocio elige color
  principal (selector de color libre, no limitado al verde de Onpilot) y
  tipografía entre un set cerrado de 4-5 opciones con licencia libre para uso
  comercial (mismo criterio que el editor de texto sobre imagen de H4 —
  reutilizar ese mismo catálogo de fuentes si ya existe).
- **Generación de copy con IA**: botón "Generar textos con Onpilot" que, a partir
  de una descripción breve del negocio (nombre, sector, tono — datos ya
  presentes en `negocios.json` de H4), llama a Claude Sonnet y redacta el
  titular, texto de portada y descripciones de cada servicio. El profesional
  edita el resultado antes de publicar, igual que con los captions de H4.
- **Historial de versiones con rollback**: cada "Publicar cambios" guarda una
  versión. El profesional puede volver a cualquier versión anterior con un
  clic. No hace falta un editor de diffs — basta con guardar snapshots
  completos y permitir restaurar uno.
- Vista previa en tiempo real dentro del propio editor (mismo patrón de
  `phone-screen` que ya usa H4 para la vista previa de publicaciones).

## 4. Sitio publicado (lo que ve el visitante)

- Lienzo visual **separado** del panel oscuro de gestión de Onpilot — la web
  pública usa el tema claro que el negocio haya configurado, nunca el tema
  oscuro del panel interno.
- Responsive: mobile-first, con derivación a escritorio (layout de dos columnas
  en hero, grid en galería — ver maqueta de referencia ya entregada,
  `onpilot_h3_pagina_web.html`).
- URL pública: `web.onpilot.io/<subdominio-del-negocio>`. Dominio propio queda
  fuera de esta v1 (mejora futura).
- SEO básico automático: `<title>`, meta description, sitemap.xml, favicon —
  generados desde los datos del negocio sin intervención manual.
- Código QR generado automáticamente apuntando a la URL pública, descargable
  desde el panel "Mi web", para compartir por WhatsApp o imprimir.

## 5. Chat de Onpilot embebido (integración con H2)

- Widget de chat flotante en la web pública, usando el mismo bot y el mismo
  prompt dinámico que ya gestiona WhatsApp en H2 — no es un bot distinto, es
  el mismo asistente en un canal más.
- Al hacer clic en un servicio del bloque "Servicios", el chat se abre con
  contexto de ese servicio ya cargado en el prompt (equivalente a como Linda
  de Bewe abre conversación con contexto al hacer clic en un servicio).
- Las conversaciones iniciadas desde la web quedan registradas en la misma
  bandeja de conversaciones de H2, con un origen distinguible ("Web") además
  de "WhatsApp".
- Las citas creadas desde este canal se guardan en la agenda real (H1) igual
  que las creadas por WhatsApp.

## 6. Reseñas — moderación obligatoria, nunca automática por puntuación

**Regla de negocio crítica**: nunca publicar una reseña en la web solo porque
tenga 4-5 estrellas. La puntuación no garantiza que el texto sea positivo.

- Bandeja de reseñas entrantes (origen: donde ya se capturen — Google, o
  cualquier fuente que Onpilot tenga integrada) visible en el panel de H3.
- El profesional ve cada reseña completa (nota + texto) y decide manualmente,
  una por una, si se publica en el bloque "Reseñas" de su web. Nunca hay
  publicación automática de una reseña sin ese clic explícito.
- Opcional, NO en v1, dejar preparado el hueco: pre-filtro con IA (Claude lee
  el texto y descarta las que tengan sentimiento negativo/mixto aunque la nota
  sea alta) para reducir el volumen que el profesional tiene que revisar en
  negocios con muchas reseñas al mes. Se activa como opción, no por defecto,
  y en ningún caso sustituye la aprobación manual final.

## 7. Notas generales

- No tocar generación de caption, Pexels, negocios/sugerencias, ni ningún otro
  bloque de H4 — H3 solo lee de esos datos, no los modifica.
- Comentarios en español, en línea con el resto del proyecto.
- Al terminar, indicar qué fuentes de Google Fonts quedaron instaladas para el
  selector de tipografía y confirmar que el bloque "Servicios" lee en vivo del
  tarifario de H1 (no una copia estática).
