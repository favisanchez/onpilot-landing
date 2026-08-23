-- H2: conversaciones de WhatsApp, mensajes, propuestas de reactivación de
-- clientes inactivos, y seguimiento de recordatorios automáticos.

CREATE TABLE conversaciones (
  id              SERIAL PRIMARY KEY,
  negocio_id      INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL, -- puede llegar un número aún no reconocido como cliente
  telefono        VARCHAR(30) NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'bot' CHECK (estado IN ('bot', 'pendiente', 'manual')),
  canal           VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'web')),
  ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_conv_negocio_telefono ON conversaciones(negocio_id, telefono);

CREATE TABLE mensajes (
  id              SERIAL PRIMARY KEY,
  conversacion_id INTEGER NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  remitente       VARCHAR(20) NOT NULL CHECK (remitente IN ('bot', 'cliente', 'profesional', 'sistema')),
  contenido       TEXT NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mensajes_conv ON mensajes(conversacion_id, creado_en);

CREATE TABLE propuestas_reactivacion (
  id               SERIAL PRIMARY KEY,
  negocio_id       INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id       INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo             VARCHAR(50) NOT NULL, -- oferta_vuelta | recordatorio | pack_descuento | vip_exclusiva
  mensaje_sugerido TEXT NOT NULL,
  coste_estimado   NUMERIC(6,4) NOT NULL DEFAULT 0.065,
  estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'descartada')),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_propuestas_negocio_estado ON propuestas_reactivacion(negocio_id, estado);

-- Evita reenviar el mismo recordatorio dos veces. Vive en H2 (no se añaden
-- columnas a "citas" de H1) porque es un concepto propio de este módulo.
CREATE TABLE recordatorios_enviados (
  id          SERIAL PRIMARY KEY,
  cita_id     INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  horas_antes SMALLINT NOT NULL,
  enviado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cita_id, horas_antes)
);

-- Cada negocio puede tener su propio número de WhatsApp Business; durante
-- el piloto solo uno lo tendrá configurado (el número de prueba de Meta).
ALTER TABLE negocios ADD COLUMN whatsapp_phone_number_id VARCHAR(50);
