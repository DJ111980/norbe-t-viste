-- NORBE T VISTE - Base auditable para devoluciones parciales de ventas.
-- Una devolucion parcial no es una anulacion de venta: la venta original y sus
-- detalles se conservan, y la devolucion queda como un evento contable aparte.

PRAGMA foreign_keys = ON;

-- La cabecera resume quien registro la devolucion, sobre que venta aplica y que
-- impacto tuvo sobre cartera o pagos. impacto_credito e impacto_pago se separan
-- porque una venta MIXTA puede afectar deuda pendiente sin devolver dinero real
-- en esta fase.
CREATE TABLE IF NOT EXISTS devoluciones_ventas (
  id_devolucion TEXT PRIMARY KEY,
  id_venta TEXT NOT NULL,
  tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('CONTADO', 'CREDITO', 'MIXTA')),
  motivo TEXT NOT NULL,
  estado_devolucion TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado_devolucion IN ('ACTIVA', 'ANULADA')),
  total_devuelto INTEGER NOT NULL DEFAULT 0 CHECK (total_devuelto >= 0),
  impacto_credito INTEGER NOT NULL DEFAULT 0 CHECK (impacto_credito >= 0),
  impacto_pago INTEGER NOT NULL DEFAULT 0 CHECK (impacto_pago >= 0),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  anulado_por TEXT,
  anulado_en TEXT,
  motivo_anulacion TEXT,
  FOREIGN KEY (id_venta) REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (creado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (anulado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
);

-- El detalle permite devolver solo algunas lineas o cantidades de la venta. Se
-- guarda id_movimiento para enlazar cada linea con el movimiento DEVOLUCION que
-- devolvera stock; asi no queda stock cambiado sin evidencia de inventario.
CREATE TABLE IF NOT EXISTS detalle_devoluciones_ventas (
  id_detalle_devolucion TEXT PRIMARY KEY,
  id_devolucion TEXT NOT NULL,
  id_detalle_venta TEXT NOT NULL,
  id_variante TEXT NOT NULL,
  cantidad_devuelta INTEGER NOT NULL CHECK (cantidad_devuelta > 0),
  precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0),
  subtotal_devuelto INTEGER NOT NULL CHECK (subtotal_devuelto >= 0),
  stock_antes INTEGER NOT NULL CHECK (stock_antes >= 0),
  stock_despues INTEGER NOT NULL CHECK (stock_despues >= 0),
  id_movimiento TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_devolucion) REFERENCES devoluciones_ventas (id_devolucion) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_detalle_venta) REFERENCES detalle_ventas (id_detalle_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_movimiento) REFERENCES movimientos_inventario (id_movimiento) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (subtotal_devuelto = cantidad_devuelta * precio_unitario)
);

-- Las devoluciones no se borran fisicamente. estado_devolucion permite una fase
-- futura de anulacion de devolucion sin perder historial ni cantidades devueltas.
-- El stock se manejara con movimientos_inventario tipo DEVOLUCION, que ya existe
-- en los CHECK actuales de movimientos_inventario.
CREATE INDEX IF NOT EXISTS idx_devoluciones_venta
ON devoluciones_ventas (id_venta);

CREATE INDEX IF NOT EXISTS idx_devoluciones_venta_estado
ON devoluciones_ventas (id_venta, estado_devolucion);

CREATE INDEX IF NOT EXISTS idx_devoluciones_estado
ON devoluciones_ventas (estado_devolucion);

CREATE INDEX IF NOT EXISTS idx_devoluciones_creado_en
ON devoluciones_ventas (creado_en);

CREATE INDEX IF NOT EXISTS idx_devoluciones_creado_por
ON devoluciones_ventas (creado_por);

CREATE INDEX IF NOT EXISTS idx_detalle_devoluciones_devolucion
ON detalle_devoluciones_ventas (id_devolucion);

CREATE INDEX IF NOT EXISTS idx_detalle_devoluciones_detalle_venta
ON detalle_devoluciones_ventas (id_detalle_venta);

CREATE INDEX IF NOT EXISTS idx_detalle_devoluciones_variante
ON detalle_devoluciones_ventas (id_variante);

CREATE INDEX IF NOT EXISTS idx_detalle_devoluciones_movimiento
ON detalle_devoluciones_ventas (id_movimiento);
