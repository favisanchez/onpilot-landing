-- Esquema inicial de Onpilot H1: negocios, auth, clientes, tarifario, citas, cobros.

CREATE TABLE negocios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  sector         VARCHAR(50)  NOT NULL,
  telefono       VARCHAR(30),
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  horarios       JSONB NOT NULL DEFAULT '{}',
  config_bot     JSONB NOT NULL DEFAULT '{}', -- preparado para H2 (bot de WhatsApp), sin usar todavía
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id           SERIAL PRIMARY KEY,
  negocio_id   INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en    TIMESTAMPTZ NOT NULL,
  revocado_en  TIMESTAMPTZ
);
CREATE INDEX idx_refresh_negocio ON refresh_tokens(negocio_id);

CREATE TABLE clientes (
  id               SERIAL PRIMARY KEY,
  negocio_id       INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre           VARCHAR(150) NOT NULL,
  telefono         VARCHAR(30),
  email            VARCHAR(150),
  fecha_alta       DATE NOT NULL DEFAULT CURRENT_DATE,
  vip              BOOLEAN NOT NULL DEFAULT false,
  descuento_vip    SMALLINT NOT NULL DEFAULT 0 CHECK (descuento_vip BETWEEN 0 AND 100),
  notas            TEXT NOT NULL DEFAULT '',
  avatar_color_idx SMALLINT NOT NULL DEFAULT 0 CHECK (avatar_color_idx BETWEEN 0 AND 4),
  -- Campos desnormalizados: se actualizan dentro de la transacción de POST /api/cobros,
  -- para no tener que recalcularlos agregando cobros en cada lectura de la ficha.
  visitas          INTEGER NOT NULL DEFAULT 0,
  gasto_total      INTEGER NOT NULL DEFAULT 0,
  ultima_visita    DATE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clientes_negocio ON clientes(negocio_id);
CREATE INDEX idx_clientes_negocio_nombre ON clientes(negocio_id, lower(nombre));

CREATE TABLE tarifario (
  id             SERIAL PRIMARY KEY,
  negocio_id     INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  servicio       VARCHAR(150) NOT NULL,
  categoria      VARCHAR(80) NOT NULL,
  precio         INTEGER NOT NULL CHECK (precio >= 0),
  duracion_min   INTEGER NOT NULL CHECK (duracion_min > 0),
  activo         BOOLEAN NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, servicio)
);
CREATE INDEX idx_tarifario_negocio ON tarifario(negocio_id);

CREATE TABLE citas (
  id              SERIAL PRIMARY KEY,
  negocio_id      INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tarifario_id    INTEGER REFERENCES tarifario(id) ON DELETE SET NULL,
  servicio_nombre VARCHAR(150) NOT NULL, -- copia del nombre al crear, estable aunque el tarifario cambie después
  duracion_min    INTEGER NOT NULL,      -- copia de la duración al crear
  fecha           DATE NOT NULL,
  hora            TIME NOT NULL,
  canal_reserva   VARCHAR(20) NOT NULL CHECK (canal_reserva IN ('WhatsApp','Teléfono','En el negocio','Email')),
  estado          VARCHAR(20) NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada','cobrada','cancelada')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_citas_negocio_fecha ON citas(negocio_id, fecha);
CREATE INDEX idx_citas_cliente ON citas(cliente_id);
-- "No se pueden crear citas en fechas pasadas" se valida solo al crear (en el
-- controlador), no con un CHECK: un CHECK se revalida también en UPDATE y
-- bloquearía cancelar o cobrar una cita cuya fecha ya pasó.

CREATE TABLE cobros (
  id              SERIAL PRIMARY KEY,
  negocio_id      INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  cita_id         INTEGER REFERENCES citas(id) ON DELETE SET NULL,
  servicio_nombre VARCHAR(150) NOT NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  precio_base     INTEGER NOT NULL,
  dto_vip         SMALLINT NOT NULL DEFAULT 0,
  dto_adicional   SMALLINT NOT NULL DEFAULT 0,
  precio_final    INTEGER NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'valido' CHECK (estado IN ('valido','error')),
  nota_error      TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Regla de negocio: un cobro nunca se borra, solo se marca estado='error'
  -- con nota_error. No existe ninguna ruta DELETE para esta tabla en la API.
);
CREATE INDEX idx_cobros_negocio_fecha ON cobros(negocio_id, fecha);
CREATE INDEX idx_cobros_cliente ON cobros(cliente_id);
