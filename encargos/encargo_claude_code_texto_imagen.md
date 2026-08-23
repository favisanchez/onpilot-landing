# Encargo para Claude Code — Onpilot H4: texto sobre imagen/vídeo

Depende de: recorte de formato (Pillow para imagen, ffmpeg para vídeo) y
del bloque de música/duración, ya resueltos en encargos anteriores. Este
encargo debe ser el ÚLTIMO paso del pipeline de procesado de medios: primero
se recorta el tramo de vídeo/música, luego se ajusta el formato (4:5/1:1/
9:16), y el texto se "quema" en último lugar, sobre el lienzo ya en su
tamaño final — así las coordenadas de posición del texto coinciden
exactamente con lo que el usuario ve y ajusta en la vista previa.

Alcance deliberadamente limitado (MVP) — no construir un editor de capas
complejo. Un solo cuadro de texto por publicación es suficiente para esta
primera versión; varios cuadros de texto puede quedar para una v2 futura.

## 1. Frontend

- Nueva sección "Texto sobre la imagen — opcional" en el formulario, con:
  - Campo de texto libre (corto, ej. máx. 80 caracteres, pensado para un
    titular/frase corta, no un párrafo).
  - Selector de tipografía: 5-6 opciones fijas, usando fuentes de Google
    Fonts de licencia libre para uso comercial (ej. Montserrat, Poppins,
    Playfair Display, Roboto, Bebas Neue, Caveat) — cubrir estilos
    distintos (moderna, elegante, informal). Añadir los archivos de fuente
    (.ttf/.otf) a `static/fonts/` descargados de Google Fonts (licencia
    SIL Open Font License, libre para uso comercial).
  - Selector de tamaño (rango simple, ej. pequeño/mediano/grande, o un
    control numérico de px).
  - Selector de color (color picker estándar de HTML, `<input
    type="color">` es suficiente).
  - Posición: el usuario puede arrastrar el cuadro de texto dentro de la
    vista previa (el "teléfono") para colocarlo donde quiera. Guardar la
    posición como coordenadas relativas (porcentaje X/Y sobre el lienzo,
    no píxeles absolutos) para que funcione igual en imagen y vídeo,
    independientemente del recorte de formato elegido.
- La vista previa debe mostrar el texto ya con la tipografía, tamaño,
  color y posición reales elegidos (no un placeholder genérico).

## 2. Backend — imagen

- Usar `Pillow` (ya añadido en el encargo de formatos) para "quemar" el
  texto sobre la imagen ya recortada al formato final: cargar la fuente
  elegida desde `static/fonts/`, dibujar el texto en la posición
  (convertir porcentaje a píxeles según el tamaño final de la imagen),
  con el tamaño y color indicados.
- Aplicar un contorno o sombra sutil al texto (buena práctica de
  legibilidad sobre fondos variados) — no hace falta que sea configurable
  por el usuario, un valor fijo razonable basta para esta versión.

## 3. Backend — vídeo

- Usar el filtro `drawtext` de `ffmpeg` sobre el vídeo ya recortado a
  tramo y formato final, con la fuente, tamaño, color y posición
  (convertir porcentaje a coordenadas de píxel del vídeo) elegidos.
- El texto se muestra durante toda la duración del vídeo en esta primera
  versión (no hace falta control de "aparece en el segundo X y desaparece
  en el Y" todavía — eso sería una mejora futura, no parte de este
  encargo).

## Notas

- No tocar generación de caption, Pexels, negocios/sugerencias, ubicaciones
  múltiples, ni el resto de bloques ya resueltos.
- Comentarios en español.
- Al terminar, confirmar qué fuentes quedaron instaladas en
  `static/fonts/` y su licencia, y si el pipeline completo (tramo → formato
  → texto) se ejecuta en ese orden sin romper los pasos anteriores.
