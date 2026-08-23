# Cómo trabajar con Claude Code Desktop en Onpilot — guía práctica

## 1. Un solo proyecto, una sola carpeta, desde el principio

Antes de pasar el primer encargo, crea en tu equipo una carpeta única para
todo el desarrollo real, por ejemplo:

```
~/onpilot-app/
```

Todo lo que Claude Code construya (H1, H2, H3, H4, H5, H6, la unificación
final) vive dentro de esa misma carpeta, como partes del mismo proyecto —
nunca carpetas sueltas por módulo. Abre Claude Code Desktop apuntando siempre
a esa carpeta, sesión tras sesión.

Dentro de esa carpeta, inicializa git desde el primer día:

```
cd ~/onpilot-app
git init
git add .
git commit -m "Setup inicial del proyecto"
```

Esto es lo que hace que "nada se pierda": cada vez que Claude Code termina un
encargo, le pides que haga commit de los cambios antes de cerrar la sesión.
Así, aunque abras una sesión nueva de Claude Code otro día, el código sigue
ahí — git no depende de que la sesión de chat "recuerde" nada.

## 2. El archivo que hace que Claude Code "no se pierda" entre sesiones

Crea un archivo `CLAUDE.md` en la raíz de `~/onpilot-app/`. Claude Code lee
este archivo automáticamente al empezar cada sesión nueva en esa carpeta —
es su forma de tener contexto persistente del proyecto, en lugar de partir de
cero cada vez.

Contenido recomendado para empezar (amplíalo con el tiempo):

```markdown
# Onpilot — contexto del proyecto

Sistema operativo para negocios locales de servicios (salud, estética,
fisioterapia). Seis módulos: H1 (agenda), H2 (WhatsApp), H3 (página web),
H4 (contenido redes), H5 (panel de control), H6 (ficha de Google).

## Stack
- Todo el sistema en Node.js + Express + PostgreSQL — un solo lenguaje, para
  que sea fácil de coger y mantener (decisión tomada explícitamente).
- H4 empezó en Flask (Python) con publicaciones reales ya probadas en
  Instagram/Facebook — se migra a Node conservando la misma lógica ya
  probada, no se reescribe desde cero.
- IA: Claude API (Haiku para el bot, Sonnet para contenido/copy)
- WhatsApp: Cloud API directa de Meta (sin BSP intermediario)

## Estado actual
(Actualizar aquí después de cada encargo completado — qué módulo está
hecho, qué falta, qué está roto.)

## Reglas de negocio que no se tocan sin confirmarlo antes
- El profesional siempre decide — el bot nunca envía nada automáticamente
  sin aprobación (reactivación, reseñas, publicaciones).
- Un cobro no se puede eliminar, solo marcar como error con nota.
- No se pueden crear citas en fechas pasadas.
- Verde de marca: #7ED957. Tipografías: Space Grotesk (títulos) + Manrope
  (texto). H1 y la web pública del cliente van en tema claro; H2, H4, H5,
  H6 van en tema oscuro.
```

Cada vez que termines un encargo con Claude Code, pídele explícitamente:
*"actualiza el CLAUDE.md con el estado actual antes de terminar"*. Es el
hábito que evita que la próxima sesión tenga que redescubrir dónde os
quedasteis.

## 3. Cómo pasar cada encargo

1. Abre Claude Code Desktop en la carpeta `~/onpilot-app/`.
2. Copia el contenido completo de un `.md` de encargo (por ejemplo,
   `encargo_claude_code_h1_backend.md`) y pégalo como tu primer mensaje.
3. Deja que trabaje y revise su propio resultado. Si algo fallara o quisieras
   ajustar algo a medio camino, dilo en la misma sesión — no hace falta
   abrir una sesión nueva para cada corrección menor.
4. Al terminar, pide expresamente:
   - Un resumen corto de qué se construyó y qué variables de entorno hacen
     falta en `.env`.
   - Que haga `git add . && git commit -m "..."` con un mensaje descriptivo
     del encargo completado.
   - Que actualice `CLAUDE.md` con el nuevo estado.
5. Prueba tú mismo lo que se ha construido (levantar el servidor en local,
   abrir en el móvil vía ngrok) antes de pasar al siguiente encargo. No
   encadenes dos encargos sin haber probado el anterior — si algo estaba mal,
   es más fácil arreglarlo antes de construir la siguiente pieza encima.

## 4. Orden recomendado de los encargos

1. `encargo_claude_code_h1_backend.md` — Agenda y clientes (base de auth/BD).
2. `encargo_claude_code_registro_permisos.md` — registro con aceptación
   legal y permisos de dispositivo (amplía el auth de H1, antes de construir
   nada que suba archivos o pida cámara/micrófono).
3. `encargo_claude_code_h2_backend.md` — WhatsApp automático (el core).
4. `encargo_claude_code_texto_imagen.md` — editor de texto sobre imagen en
   H4 (ya estaba escrito, pendiente de enviar; cierra lo que falta de H4
   a nivel de producto, antes de migrarlo de lenguaje).
5. `encargo_claude_code_migracion_h4_node.md` — migrar H4 de Flask a
   Node/Express, conservando la lógica ya probada (pendiente de redactar
   contigo el detalle antes de encargarlo — es un encargo delicado). Incluir
   en este mismo encargo la adenda
   `encargo_claude_code_h4_captura_camara.md` (captura de foto/vídeo en vivo
   desde el dispositivo, nueva funcionalidad que se construye ya sobre Node
   para no hacerla dos veces).
6. `encargo_claude_code_h3_pagina_web.md` — Página web.
7. `encargo_claude_code_h6_ficha_google.md` — Ficha de Google (puente
   manual).
8. `encargo_claude_code_h5_backend.md` — Panel de control (depende de que
   H1 y H2 ya tengan datos reales que cruzar).
9. `encargo_claude_code_00_unificacion.md` — el último, siempre. Junta todo
   en un solo sistema navegable con un solo login, ya con los seis módulos
   en el mismo lenguaje.

No hace falta pasarlos en una sola sesión maratoniana — de hecho es mejor no
hacerlo. Un encargo por sesión (o por día), probado antes de seguir, es más
seguro que encadenar todo de golpe.

## 5. Si algo se rompe o quieres retomar tras un parón

- `git log --oneline` te muestra el historial de encargos completados.
- `git diff` o revisar commits anteriores te permite ver qué cambió en cada
  paso si algo deja de funcionar tras un encargo.
- Al reabrir Claude Code Desktop tras días sin tocar el proyecto, léele en
  el primer mensaje algo como: *"Retomamos el proyecto Onpilot. Lee
  CLAUDE.md y el historial de git para situarte, y dime en qué estado
  quedó todo antes de que sigamos."*
