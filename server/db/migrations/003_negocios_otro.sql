-- Estado de revisión del negocio (para el sector "Otro", fuera del catálogo
-- cerrado) y los datos que aporta al registrarse para poder revisarlo:
-- descripción libre y enlace a su web/ficha de Google Business.
ALTER TABLE negocios
  ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'pendiente_revision')),
  ADD COLUMN otro_descripcion TEXT,
  ADD COLUMN otro_web VARCHAR(500);
