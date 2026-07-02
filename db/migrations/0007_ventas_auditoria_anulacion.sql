-- NORBE T VISTE - Auditoria para ventas y pagos.
-- La primera fase de ventas sera contado: crear venta, pago, descuento de stock
-- y movimientos VENTA. Credito, mixta y abonos quedan preparados para fases
-- posteriores para no mezclar cartera con el primer flujo de caja.

PRAGMA foreign_keys = ON;

-- Las ventas no se eliminan fisicamente: se conservan para auditoria, recibos,
-- cartera e historial de inventario. Estos campos permiten anular sin perder
-- trazabilidad y luego devolver stock con movimientos ANULACION_VENTA.
ALTER TABLE ventas
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ventas
ADD COLUMN anulado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ventas
ADD COLUMN anulado_en TEXT;

ALTER TABLE ventas
ADD COLUMN motivo_anulacion TEXT;

-- Los pagos tampoco se eliminan fisicamente. estado_pago deja preparada la
-- anulacion futura de pagos; id_usuario permite auditar quien recibio el pago.
ALTER TABLE pagos_ventas
ADD COLUMN id_usuario TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE pagos_ventas
ADD COLUMN estado_pago TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado_pago IN ('ACTIVO', 'ANULADO'));

ALTER TABLE pagos_ventas
ADD COLUMN anulado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE pagos_ventas
ADD COLUMN anulado_en TEXT;

ALTER TABLE pagos_ventas
ADD COLUMN motivo_anulacion TEXT;

CREATE INDEX IF NOT EXISTS idx_ventas_estado
ON ventas (estado_venta);

CREATE INDEX IF NOT EXISTS idx_ventas_tipo
ON ventas (tipo_venta);

CREATE INDEX IF NOT EXISTS idx_ventas_cliente
ON ventas (id_cliente);

CREATE INDEX IF NOT EXISTS idx_ventas_usuario
ON ventas (id_usuario);

CREATE INDEX IF NOT EXISTS idx_ventas_creado_en
ON ventas (creado_en);

CREATE INDEX IF NOT EXISTS idx_ventas_anulado_en
ON ventas (anulado_en);

CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta
ON detalle_ventas (id_venta);

CREATE INDEX IF NOT EXISTS idx_detalle_ventas_variante
ON detalle_ventas (id_variante);

CREATE INDEX IF NOT EXISTS idx_pagos_ventas_venta
ON pagos_ventas (id_venta);

CREATE INDEX IF NOT EXISTS idx_pagos_ventas_usuario
ON pagos_ventas (id_usuario);

CREATE INDEX IF NOT EXISTS idx_pagos_ventas_estado
ON pagos_ventas (estado_pago);

CREATE INDEX IF NOT EXISTS idx_pagos_ventas_creado_en
ON pagos_ventas (creado_en);
