-- NORBE T VISTE - Lotes de entrada e inventario controlado.
-- El stock real vive en variantes_producto.stock_actual; el producto base no
-- maneja unidades disponibles. Todo cambio de stock debe quedar auditado en
-- movimientos_inventario para poder reconstruir entradas, ajustes y ventas.

PRAGMA foreign_keys = OFF;

-- Se reconstruye lotes_entrada porque SQLite/D1 no permite cambiar un CHECK
-- existente con ALTER TABLE. RECIBIDO se migra a CONFIRMADO para reflejar que
-- el stock aumenta solo cuando el lote queda confirmado, no al crear borradores.
ALTER TABLE lotes_entrada RENAME TO lotes_entrada_anterior;

CREATE TABLE lotes_entrada (
  id_lote TEXT PRIMARY KEY,
  id_proveedor TEXT,
  creado_por TEXT NOT NULL,
  actualizado_por TEXT,
  confirmado_por TEXT,
  confirmado_en TEXT,
  anulado_por TEXT,
  anulado_en TEXT,
  motivo_anulacion TEXT,
  numero_lote TEXT NOT NULL UNIQUE,
  tipo_lote TEXT NOT NULL CHECK (tipo_lote IN ('COMPRA', 'ENVIO', 'INVENTARIO_INICIAL', 'AJUSTE')),
  fecha_lote TEXT NOT NULL,
  numero_factura_proveedor TEXT,
  numero_guia_envio TEXT,
  modo_envio TEXT,
  empresa_transportadora TEXT,
  costo_envio INTEGER NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
  total_compra INTEGER NOT NULL DEFAULT 0 CHECK (total_compra >= 0),
  estado_lote TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (
    estado_lote IN ('BORRADOR', 'CONFIRMADO', 'ANULADO')
  ),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (creado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (actualizado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (confirmado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (anulado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
);

INSERT INTO lotes_entrada (
  id_lote,
  id_proveedor,
  creado_por,
  actualizado_por,
  confirmado_por,
  confirmado_en,
  anulado_por,
  anulado_en,
  motivo_anulacion,
  numero_lote,
  tipo_lote,
  fecha_lote,
  numero_factura_proveedor,
  numero_guia_envio,
  modo_envio,
  empresa_transportadora,
  costo_envio,
  total_compra,
  estado_lote,
  observaciones,
  creado_en,
  actualizado_en
)
SELECT
  id_lote,
  id_proveedor,
  id_usuario,
  id_usuario,
  CASE WHEN estado_lote = 'RECIBIDO' THEN id_usuario ELSE NULL END,
  CASE WHEN estado_lote = 'RECIBIDO' THEN actualizado_en ELSE NULL END,
  NULL,
  NULL,
  NULL,
  numero_lote,
  tipo_lote,
  fecha_lote,
  numero_factura_proveedor,
  numero_guia_envio,
  modo_envio,
  empresa_transportadora,
  costo_envio,
  total_compra,
  CASE WHEN estado_lote = 'RECIBIDO' THEN 'CONFIRMADO' ELSE estado_lote END,
  observaciones,
  creado_en,
  actualizado_en
FROM lotes_entrada_anterior;

-- El detalle conserva el costo real por lote. No se usa el costo del producto
-- base como definitivo porque puede cambiar entre compras o proveedores.
ALTER TABLE detalle_lotes_entrada RENAME TO detalle_lotes_entrada_anterior;

CREATE TABLE detalle_lotes_entrada (
  id_detalle_lote TEXT PRIMARY KEY,
  id_lote TEXT NOT NULL,
  id_variante TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  costo_unitario INTEGER NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  precio_venta_sugerido INTEGER NOT NULL DEFAULT 0 CHECK (precio_venta_sugerido >= 0),
  subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  cantidad_etiquetas_qr INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_etiquetas_qr >= 0),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_lote) REFERENCES lotes_entrada (id_lote) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT
);

INSERT INTO detalle_lotes_entrada (
  id_detalle_lote,
  id_lote,
  id_variante,
  cantidad,
  costo_unitario,
  precio_venta_sugerido,
  subtotal,
  cantidad_etiquetas_qr,
  observaciones,
  creado_en,
  actualizado_en
)
SELECT
  id_detalle_lote,
  id_lote,
  id_variante,
  cantidad_recibida,
  precio_compra_unitario,
  precio_venta_sugerido,
  subtotal_compra,
  cantidad_etiquetas_qr,
  observaciones,
  creado_en,
  creado_en
FROM detalle_lotes_entrada_anterior;

-- Se reconstruye movimientos_inventario para usar tipos explicitos. Inventario
-- inicial y ajustes quedan como movimientos porque tambien modifican stock y
-- deben auditar stock_antes/stock_despues. Los tipos de venta quedan preparados,
-- pero ventas todavia no se implementa en esta fase.
ALTER TABLE movimientos_inventario RENAME TO movimientos_inventario_anterior;

CREATE TABLE movimientos_inventario (
  id_movimiento TEXT PRIMARY KEY,
  id_variante TEXT NOT NULL,
  creado_por TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL CHECK (
    tipo_movimiento IN (
      'LOTE_ENTRADA',
      'INVENTARIO_INICIAL',
      'AJUSTE_POSITIVO',
      'AJUSTE_NEGATIVO',
      'VENTA',
      'ANULACION_VENTA',
      'DEVOLUCION'
    )
  ),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  stock_antes INTEGER NOT NULL CHECK (stock_antes >= 0),
  stock_despues INTEGER NOT NULL CHECK (stock_despues >= 0),
  motivo TEXT,
  referencia_tipo TEXT CHECK (
    referencia_tipo IS NULL
    OR referencia_tipo IN (
      'LOTE_ENTRADA',
      'INVENTARIO_INICIAL',
      'AJUSTE_INVENTARIO',
      'VENTA',
      'ANULACION_VENTA',
      'DEVOLUCION'
    )
  ),
  referencia_id TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (creado_por) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (
    (referencia_tipo IS NULL AND referencia_id IS NULL)
    OR (referencia_tipo IS NOT NULL AND referencia_id IS NOT NULL)
  )
);

INSERT INTO movimientos_inventario (
  id_movimiento,
  id_variante,
  creado_por,
  tipo_movimiento,
  cantidad,
  stock_antes,
  stock_despues,
  motivo,
  referencia_tipo,
  referencia_id,
  creado_en
)
SELECT
  id_movimiento,
  id_variante,
  id_usuario,
  CASE
    WHEN tipo_movimiento = 'VENTA' THEN 'VENTA'
    WHEN tipo_movimiento = 'DEVOLUCION' THEN 'DEVOLUCION'
    WHEN tipo_movimiento = 'SALIDA' THEN 'AJUSTE_NEGATIVO'
    WHEN tipo_movimiento = 'AJUSTE' THEN 'AJUSTE_POSITIVO'
    ELSE 'LOTE_ENTRADA'
  END,
  cantidad,
  stock_antes,
  stock_despues,
  motivo,
  CASE
    WHEN referencia_tipo = 'VENTA' THEN 'VENTA'
    WHEN referencia_tipo = 'DEVOLUCION' THEN 'DEVOLUCION'
    WHEN referencia_tipo = 'AJUSTE' THEN 'AJUSTE_INVENTARIO'
    WHEN referencia_tipo = 'LOTE' THEN 'LOTE_ENTRADA'
    ELSE referencia_tipo
  END,
  referencia_id,
  creado_en
FROM movimientos_inventario_anterior;

DROP TABLE movimientos_inventario_anterior;
DROP TABLE detalle_lotes_entrada_anterior;
DROP TABLE lotes_entrada_anterior;

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_lotes_entrada_estado
ON lotes_entrada (estado_lote);

CREATE INDEX IF NOT EXISTS idx_lotes_entrada_proveedor
ON lotes_entrada (id_proveedor);

CREATE INDEX IF NOT EXISTS idx_lotes_entrada_confirmado_en
ON lotes_entrada (confirmado_en);

CREATE INDEX IF NOT EXISTS idx_lotes_entrada_creado_por
ON lotes_entrada (creado_por);

CREATE INDEX IF NOT EXISTS idx_lotes_fecha
ON lotes_entrada (fecha_lote);

CREATE INDEX IF NOT EXISTS idx_detalle_lotes_lote
ON detalle_lotes_entrada (id_lote);

CREATE INDEX IF NOT EXISTS idx_detalle_lotes_variante
ON detalle_lotes_entrada (id_variante);

CREATE INDEX IF NOT EXISTS idx_movimientos_variante
ON movimientos_inventario (id_variante);

CREATE INDEX IF NOT EXISTS idx_movimientos_tipo
ON movimientos_inventario (tipo_movimiento);

CREATE INDEX IF NOT EXISTS idx_movimientos_referencia
ON movimientos_inventario (referencia_tipo, referencia_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en
ON movimientos_inventario (creado_en);

CREATE INDEX IF NOT EXISTS idx_movimientos_creado_por
ON movimientos_inventario (creado_por);
