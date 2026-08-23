# Adenda — Onpilot H4: captura de foto/vídeo en vivo desde el dispositivo

**Incluir esto dentro del encargo de migración de H4 a Node/Express**, no
como encargo aparte — construirlo antes de la migración significaría
reconstruirlo dos veces.

## Objetivo

Hoy, en la sección "Imagen o vídeo" de H4, el profesional solo puede subir un
archivo ya existente en su dispositivo, o elegir una foto/vídeo de Pexels.
Falta una tercera opción: **capturar una foto o grabar un vídeo con la cámara
del dispositivo en el momento**, sin salir de Onpilot, y usarlo directamente
en la publicación que se está creando.

Esto conecta con el encargo de permisos de dispositivo
(`encargo_claude_code_registro_permisos.md`) — reutilizar de ahí la lógica de
solicitud de permiso de cámara/micrófono, no duplicarla.

## Frontend

- Tercera opción junto a "Subir archivo" y "Buscar en Pexels": **"Usar la
  cámara"**.
- Al seleccionarla, pedir permiso de cámara (y micrófono si se va a grabar
  vídeo con sonido) vía `getUserMedia()`. Si se deniega, mostrar el mismo
  mensaje ya definido en el encargo de permisos y ofrecer las otras dos vías.
- Modo foto: vista previa en vivo de la cámara, botón de disparo, captura
  como imagen fija (`canvas` a partir del stream de vídeo).
- Modo vídeo: vista previa en vivo, botón de grabar/detener, con el mismo
  límite de duración que ya aplica a Reels/Stories en el pipeline existente
  (evitar que se grabe algo que luego no se pueda usar sin recortar).
- Opción de cambiar entre cámara frontal y trasera si el dispositivo tiene
  varias (`facingMode`).
- Tras capturar: el resultado entra en el mismo flujo que ya existe para un
  archivo subido — vista previa, carrusel, texto sobre imagen, música,
  recorte de formato — sin bifurcar la lógica según el origen del archivo.

## Backend

- La foto/vídeo capturado se sube al mismo endpoint que ya gestiona archivos
  subidos por el usuario (equivalente a `/api/upload-media` del encargo
  original de H4) — no crear un endpoint nuevo solo por venir de la cámara.
- El resto del pipeline (recorte de formato, texto sobre imagen, música,
  publicación) no necesita saber si el archivo vino de un `<input file>` o de
  una captura de cámara — mismo archivo, mismo tratamiento.

## Notas

- No es una función exclusiva de escritorio — debe funcionar igual de bien
  en móvil, donde de hecho es más probable que se use (el profesional
  fotografiando algo del negocio en el momento).
- Comentarios en español.
- Al terminar: confirmar que funciona en al menos un navegador de escritorio
  y uno móvil real (no solo en el emulador), ya que el acceso a cámara tiene
  comportamientos distintos entre navegadores.
