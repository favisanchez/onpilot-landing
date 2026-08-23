-- Prueba de consentimiento legal en el registro: versión de los Términos de
-- Uso / Política de Privacidad aceptada por cada negocio y cuándo. Nullable
-- a propósito: los negocios sembrados antes de este encargo no pasaron por
-- este gate y no se backfillean (son cuentas de demo).

ALTER TABLE negocios
  ADD COLUMN terminos_version VARCHAR(30),
  ADD COLUMN terminos_aceptados_en TIMESTAMPTZ;
