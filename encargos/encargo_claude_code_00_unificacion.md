# Encargo para Claude Code — Onpilot: unificación del sistema completo

**Pasar este encargo EL ÚLTIMO**, después de que H1, H2, H3, H5 y H6 tengan
backend real y funcionen por separado, y H4 tenga ya el editor de texto sobre
imagen terminado. Es el encargo que convierte cinco/seis piezas sueltas en un
producto único y presentable.

## 1. El problema a resolver

Hoy existen dos bases de frontend distintas (`onpilot_agenda.html` para H1,
`onpilot_system.html` para H2/H5, más H3/H6 nuevos construidos aparte).
H4 ya debería estar migrado a Node/Express antes de llegar a este encargo
(ver `encargo_claude_code_migracion_h4_node.md`) — si por lo que sea no lo
está, no continuar con este encargo hasta que lo esté; unificar sobre un
servicio en otro lenguaje generaría más deuda técnica, no menos.

El objetivo de este encargo es que el usuario final entre a **una sola URL**,
inicie sesión una vez, y navegue entre Agenda, WhatsApp, Página web,
Contenido, Panel de control y Ficha de Google sin notar que fueron
construidos por separado.

## 2. Autenticación única

Todo el sistema, incluido lo que era H4, comparte el mismo JWT de sesión de
Onpilot generado en el registro/login (ver `encargo_claude_code_h1_backend.md`
y `encargo_claude_code_registro_permisos.md`) — un negocio inicia sesión una
sola vez y accede a los seis módulos sin volver a autenticarse.

## 3. Navegación unificada

- Un único Dashboard de entrada (ya definido en `onpilot_system.html`:
  saludo, tarjeta hero con resumen del día, accesos rápidos, alertas) que
  enlaza a los cinco/seis módulos.
- Mover el frontend de H1 (`onpilot_agenda.html`, ya con backend real) dentro
  de la misma estructura de navegación que H2/H5 (que vienen de
  `onpilot_system.html`), en vez de ser una página aparte.
- H3 (página web del negocio) y H6 (kit de Google) se integran como
  secciones nuevas del mismo Dashboard, con sus propios iconos de acceso
  rápido — ya construidos como maquetas aparte
  (`onpilot_h3_pagina_web.html`, `onpilot_h3_kit_google.html`), toca
  integrarlos al layout real, no reconstruirlos desde cero.

## 4. Consistencia visual final

- Auditoría de que TODO el sistema usa el mismo verde (`#7ED957`), las
  mismas dos tipografías (Space Grotesk/Manrope), y respeta el criterio ya
  aplicado módulo a módulo (H1 y H3-web-pública en claro; H2, H4, H5, H6 en
  oscuro) — revisar que no queden restos de `#1D9E75`, DM Sans o iconos
  Tabler de la versión antigua de H1.
- Logo de Onpilot (`1.png`/`2.png`, ya en el repo) en la cabecera/sidebar de
  navegación.

## 5. Multi-tenant de extremo a extremo

- Confirmar que un negocio que inicia sesión ve únicamente sus propios datos
  en los seis módulos, incluido H4 (hoy probado solo con la cuenta propia de
  Onpilot en Meta — al unificar, cada negocio necesita su propia conexión de
  Meta, no la de Onpilot).

## 6. Qué NO hacer en este encargo

- No añadir funcionalidades nuevas — este encargo es de integración, no de
  producto. Cualquier funcionalidad que falte se gestiona en un encargo
  aparte, después de confirmar que la unificación funciona.
- No tocar la lógica de negocio ya construida en cada módulo individual,
  solo cómo se accede a ella y cómo se ve.

## 7. Notas generales

- Comentarios en español.
- Al terminar: entregar la URL única de acceso (local vía ngrok, o Railway si
  ya se decidió desplegar), y una checklist de que cada módulo es accesible
  y funcional desde el Dashboard con un solo login.
