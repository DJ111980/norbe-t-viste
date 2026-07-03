-- NORBE T VISTE - Auditoria y consultas para cartera.
-- Las deudas no se guardan directamente en clientes: el saldo real se obtiene
-- desde creditos, abonos y ajustes para conservar historial y explicar cambios.
-- Venta a credito y venta mixta se implementaran despues de fortalecer cartera,
-- porque dependen de saldos, abonos, anulaciones y auditoria consistentes.

PRAGMA foreign_keys = ON;

-- Los creditos no se eliminan fisicamente. Si un credito se anula, queda
-- marcado con usuario, fecha y motivo para revisar la decision despues.
ALTER TABLE creditos_clientes
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE creditos_clientes
ADD COLUMN anulado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE creditos_clientes
ADD COLUMN anulado_en TEXT;

ALTER TABLE creditos_clientes
ADD COLUMN motivo_anulacion TEXT;

-- Los abonos tampoco se eliminan fisicamente. estado_abono permite anular un
-- abono futuro sin borrar el recibo historico ni perder quien lo registro.
ALTER TABLE abonos_creditos
ADD COLUMN estado_abono TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado_abono IN ('ACTIVO', 'ANULADO'));

ALTER TABLE abonos_creditos
ADD COLUMN anulado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE abonos_creditos
ADD COLUMN anulado_en TEXT;

ALTER TABLE abonos_creditos
ADD COLUMN motivo_anulacion TEXT;

-- Ajustes_creditos ya conserva id_credito, tipo, valor, saldo_antes,
-- saldo_despues, motivo obligatorio, usuario y fecha. Se deja inmutable por
-- ahora: cada ajuste sera un registro auditable, no algo que se edita o borra.

CREATE INDEX IF NOT EXISTS idx_creditos_cliente
ON creditos_clientes (id_cliente);

CREATE INDEX IF NOT EXISTS idx_creditos_estado
ON creditos_clientes (estado_credito);

CREATE INDEX IF NOT EXISTS idx_creditos_origen
ON creditos_clientes (origen_credito);

CREATE INDEX IF NOT EXISTS idx_creditos_fecha
ON creditos_clientes (fecha_credito);

CREATE INDEX IF NOT EXISTS idx_creditos_saldo
ON creditos_clientes (saldo_pendiente);

CREATE INDEX IF NOT EXISTS idx_creditos_venta
ON creditos_clientes (id_venta);

CREATE INDEX IF NOT EXISTS idx_abonos_credito
ON abonos_creditos (id_credito);

CREATE INDEX IF NOT EXISTS idx_abonos_usuario
ON abonos_creditos (id_usuario);

CREATE INDEX IF NOT EXISTS idx_abonos_fecha
ON abonos_creditos (fecha_abono);

CREATE INDEX IF NOT EXISTS idx_abonos_estado
ON abonos_creditos (estado_abono);

CREATE INDEX IF NOT EXISTS idx_ajustes_credito
ON ajustes_creditos (id_credito);

CREATE INDEX IF NOT EXISTS idx_ajustes_tipo
ON ajustes_creditos (tipo_ajuste);

CREATE INDEX IF NOT EXISTS idx_ajustes_creado_en
ON ajustes_creditos (creado_en);

CREATE INDEX IF NOT EXISTS idx_detalle_creditos_credito
ON detalle_creditos (id_credito);
