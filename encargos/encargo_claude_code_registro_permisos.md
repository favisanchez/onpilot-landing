# Encargo para Claude Code — Onpilot: registro, aceptación legal y permisos de dispositivo

Pasar este encargo justo después de H1 (ya que reutiliza y amplía su sistema
de autenticación) y antes de H3/H4, porque ambos necesitan acceso a cámara/
galería/micrófono del dispositivo del usuario.

## 1. Registro con aceptación legal obligatoria

- El formulario de registro de negocio (ya creado en H1) debe incluir,
  además de email/contraseña: checkbox obligatorio de aceptación de
  Términos de Uso y Política de Privacidad (enlaces a páginas reales — si
  todavía no existen esos textos, crear versiones placeholder claramente
  marcadas como "borrador, pendiente de revisión legal" para no bloquear el
  desarrollo, pero sin dejar el checkbox sin destino).
- No se puede completar el registro sin marcar el checkbox — validación en
  frontend y backend (nunca confiar solo en el frontend para algo con
  implicación legal).
- Guardar en base de datos, por cada negocio: fecha y hora exacta de
  aceptación, versión del documento aceptado (por si los términos cambian
  más adelante y hay que volver a pedir aceptación). Es el mismo tipo de
  registro de prueba de consentimiento que ya se definió para el opt-in del
  motor de reactivación en H2 — aplicar el mismo criterio aquí.
- Si se actualizan los Términos o la Política de Privacidad en el futuro,
  dejar preparado (aunque no se active en esta v1) un mecanismo simple para
  detectar que un negocio aceptó una versión antigua y pedirle que acepte
  la nueva antes de seguir usando el sistema.

## 2. Permisos de dispositivo — solo donde de verdad se necesitan

No pedir permisos "por si acaso" — cada permiso se solicita en el momento
exacto en que la funcionalidad lo necesita, con el navegador mostrando el
diálogo nativo de permiso (nunca simularlo con un modal propio que parezca
un permiso del sistema — eso genera desconfianza y en algunos navegadores
está mal visto).

- **Cámara y micrófono** (H4 — cuando el profesional quiera grabar un vídeo
  o hacer una foto directamente desde Onpilot, no solo subir un archivo ya
  existente): usar `navigator.mediaDevices.getUserMedia()`. Si el usuario
  deniega el permiso, mostrar un mensaje claro ("No hemos podido acceder a
  tu cámara — puedes subir un archivo en su lugar") y ofrecer la vía
  alternativa de subida de archivo ya existente, sin romper el flujo.
- **Galería / archivos del dispositivo** (H3, H4, importación de clientes en
  H1): usar el `<input type="file">` estándar del navegador — esto no
  requiere un permiso especial del sistema operativo en la mayoría de
  navegadores modernos, es el propio selector de archivos nativo. No
  confundir con el permiso de cámara/micrófono, que sí es un permiso real
  del sistema.
- Ninguna funcionalidad debe fallar en silencio si el permiso se deniega —
  siempre un mensaje explicando qué ha pasado y qué alternativa hay.

## 3. Dónde aplica cada permiso, por módulo

- H1: importación de clientes por CSV/Excel → selector de archivo estándar,
  sin permiso especial.
- H3: subida de imágenes propias para bloques de la web → selector de
  archivo. Si en el futuro se añade "hacer foto ahora" en vez de solo subir
  → cámara.
- H4: subida de imágenes/vídeo para publicaciones → selector de archivo
  (ya existente); grabación directa de foto/vídeo/audio desde Onpilot (si se
  decide construir esta función) → cámara/micrófono.

## 4. Notas generales

- Comentarios en español.
- Al terminar: confirmar que el registro no se puede completar sin aceptar
  términos (probarlo intentando saltárselo), y que cada solicitud de permiso
  de dispositivo aparece justo en el momento de uso, no al entrar en la app.
