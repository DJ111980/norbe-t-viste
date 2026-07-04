-- NORBE T VISTE - Esquema inicial para Cloudflare D1.
-- D1 esta basado en SQLite: los IDs se guardan como TEXT para permitir UUIDs o codigos internos.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS configuracion_negocio (
  id_configuracion TEXT PRIMARY KEY,
  nombre_negocio TEXT NOT NULL,
  eslogan TEXT NOT NULL DEFAULT 'Gestion comercial',
  descripcion_login TEXT NOT NULL DEFAULT 'Gestion comercial lista para operar desde el navegador.',
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  -- El logo no se guarda en D1; aqui solo queda la ruta o key del archivo en R2.
  logo_imagen TEXT,
  moneda TEXT NOT NULL DEFAULT 'COP',
  mensaje_recibo TEXT,
  color_principal TEXT,
  color_secundario TEXT,
  color_acento TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario TEXT PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  nombre_usuario TEXT NOT NULL UNIQUE,
  correo TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'VENDEDOR')),
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  ultimo_acceso TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente TEXT PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  documento TEXT,
  telefono TEXT,
  telefono_secundario TEXT,
  direccion TEXT,
  ciudad TEXT,
  correo TEXT,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proveedores (
  id_proveedor TEXT PRIMARY KEY,
  nombre_proveedor TEXT NOT NULL,
  tipo_documento TEXT,
  numero_documento TEXT,
  nombre_contacto TEXT,
  telefono_principal TEXT,
  telefono_secundario TEXT,
  correo TEXT,
  ciudad TEXT,
  direccion TEXT,
  pais TEXT,
  modo_envio TEXT CHECK (
    modo_envio IS NULL
    OR modo_envio IN (
      'ENVIO_TRANSPORTADORA',
      'RECOGIDA_EN_LOCAL',
      'DOMICILIO',
      'ENCOMIENDA',
      'OTRO'
    )
  ),
  empresa_transportadora TEXT,
  tiempo_entrega_estimado TEXT,
  forma_pago TEXT,
  cuenta_pago TEXT,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria TEXT PRIMARY KEY,
  nombre_categoria TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS productos (
  id_producto TEXT PRIMARY KEY,
  id_categoria TEXT,
  nombre_producto TEXT NOT NULL,
  descripcion TEXT,
  marca TEXT,
  referencia TEXT,
  -- Ruta o key de R2. La imagen binaria nunca debe guardarse en esta tabla.
  imagen_principal TEXT,
  mostrar_en_catalogo INTEGER NOT NULL DEFAULT 0 CHECK (mostrar_en_catalogo IN (0, 1)),
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS variantes_producto (
  id_variante TEXT PRIMARY KEY,
  id_producto TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  -- El QR pertenece a la variante y solo guarda este codigo interno, no datos de precio ni stock.
  codigo_qr TEXT NOT NULL UNIQUE,
  ruta_qr TEXT,
  talla TEXT,
  color TEXT,
  precio_compra INTEGER NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  precio_venta INTEGER NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  -- Regla central: el stock real del negocio vive en la variante, no en productos.
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  imagen_variante TEXT,
  mostrar_en_catalogo INTEGER NOT NULL DEFAULT 0 CHECK (mostrar_en_catalogo IN (0, 1)),
  estado TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_producto) REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS imagenes_productos (
  id_imagen TEXT PRIMARY KEY,
  id_producto TEXT NOT NULL,
  id_variante TEXT,
  tipo_imagen TEXT NOT NULL CHECK (tipo_imagen IN ('PRODUCTO', 'VARIANTE')),
  -- Ruta o key en R2. D1 solo conserva la referencia al archivo.
  ruta_imagen TEXT NOT NULL,
  es_principal INTEGER NOT NULL DEFAULT 0 CHECK (es_principal IN (0, 1)),
  orden INTEGER NOT NULL DEFAULT 0 CHECK (orden >= 0),
  estado TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'INACTIVA')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_producto) REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (
    (tipo_imagen = 'PRODUCTO' AND id_variante IS NULL)
    OR (tipo_imagen = 'VARIANTE' AND id_variante IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS lotes_entrada (
  id_lote TEXT PRIMARY KEY,
  id_proveedor TEXT,
  id_usuario TEXT NOT NULL,
  numero_lote TEXT NOT NULL UNIQUE,
  tipo_lote TEXT NOT NULL CHECK (tipo_lote IN ('COMPRA', 'ENVIO', 'INVENTARIO_INICIAL', 'AJUSTE')),
  fecha_lote TEXT NOT NULL,
  numero_factura_proveedor TEXT,
  numero_guia_envio TEXT,
  modo_envio TEXT,
  empresa_transportadora TEXT,
  costo_envio INTEGER NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
  total_compra INTEGER NOT NULL DEFAULT 0 CHECK (total_compra >= 0),
  estado_lote TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado_lote IN ('BORRADOR', 'RECIBIDO', 'ANULADO')),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalle_lotes_entrada (
  id_detalle_lote TEXT PRIMARY KEY,
  id_lote TEXT NOT NULL,
  id_variante TEXT NOT NULL,
  cantidad_recibida INTEGER NOT NULL CHECK (cantidad_recibida > 0),
  precio_compra_unitario INTEGER NOT NULL DEFAULT 0 CHECK (precio_compra_unitario >= 0),
  precio_venta_sugerido INTEGER NOT NULL DEFAULT 0 CHECK (precio_venta_sugerido >= 0),
  subtotal_compra INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_compra >= 0),
  cantidad_etiquetas_qr INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_etiquetas_qr >= 0),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_lote) REFERENCES lotes_entrada (id_lote) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento TEXT PRIMARY KEY,
  id_variante TEXT NOT NULL,
  id_usuario TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA', 'VENTA', 'DEVOLUCION', 'AJUSTE')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  stock_antes INTEGER NOT NULL CHECK (stock_antes >= 0),
  stock_despues INTEGER NOT NULL CHECK (stock_despues >= 0),
  motivo TEXT,
  referencia_tipo TEXT CHECK (
    referencia_tipo IS NULL
    OR referencia_tipo IN ('VENTA', 'LOTE', 'AJUSTE', 'DEVOLUCION')
  ),
  referencia_id TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS ventas (
  id_venta TEXT PRIMARY KEY,
  numero_venta TEXT NOT NULL UNIQUE,
  id_cliente TEXT,
  id_usuario TEXT NOT NULL,
  tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('CONTADO', 'CREDITO', 'MIXTA')),
  subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  descuento INTEGER NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  valor_pagado_inicial INTEGER NOT NULL DEFAULT 0 CHECK (valor_pagado_inicial >= 0),
  saldo_pendiente INTEGER NOT NULL DEFAULT 0 CHECK (saldo_pendiente >= 0),
  -- Las ventas con errores se conservan para historial y auditoria; no se eliminan.
  estado_venta TEXT NOT NULL DEFAULT 'COMPLETADA' CHECK (estado_venta IN ('COMPLETADA', 'ANULADA')),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (descuento <= subtotal),
  CHECK (total = subtotal - descuento),
  CHECK (valor_pagado_inicial <= total),
  CHECK (saldo_pendiente = total - valor_pagado_inicial),
  CHECK (
    (tipo_venta = 'CONTADO' AND saldo_pendiente = 0)
    OR (tipo_venta IN ('CREDITO', 'MIXTA') AND id_cliente IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id_detalle_venta TEXT PRIMARY KEY,
  id_venta TEXT NOT NULL,
  id_variante TEXT NOT NULL,
  codigo_qr TEXT NOT NULL,
  -- Datos historicos: aunque cambie el producto despues, la venta conserva la foto del momento.
  nombre_producto TEXT NOT NULL,
  sku TEXT NOT NULL,
  talla TEXT,
  color TEXT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0),
  descuento INTEGER NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_venta) REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (descuento <= (cantidad * precio_unitario)),
  CHECK (subtotal = (cantidad * precio_unitario) - descuento)
);

CREATE TABLE IF NOT EXISTS pagos_ventas (
  id_pago_venta TEXT PRIMARY KEY,
  id_venta TEXT NOT NULL,
  metodo_pago TEXT NOT NULL CHECK (
    metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'OTRO')
  ),
  valor_pagado INTEGER NOT NULL CHECK (valor_pagado > 0),
  referencia_pago TEXT,
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_venta) REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS creditos_clientes (
  id_credito TEXT PRIMARY KEY,
  id_cliente TEXT NOT NULL,
  id_venta TEXT,
  id_usuario TEXT NOT NULL,
  origen_credito TEXT NOT NULL CHECK (origen_credito IN ('VENTA', 'DEUDA_ANTIGUA', 'AJUSTE_MANUAL')),
  tipo_deuda_antigua TEXT CHECK (
    tipo_deuda_antigua IS NULL
    OR tipo_deuda_antigua IN ('SOLO_MONTO', 'CON_PRODUCTOS')
  ),
  descripcion_credito TEXT,
  monto_inicial INTEGER NOT NULL CHECK (monto_inicial >= 0),
  monto_abonado INTEGER NOT NULL DEFAULT 0 CHECK (monto_abonado >= 0),
  -- El saldo se actualiza desde la logica transaccional del backend.
  -- No depende solo de monto_inicial - monto_abonado porque puede haber aumentos,
  -- descuentos, anulaciones o correcciones registrados en ajustes_creditos.
  saldo_pendiente INTEGER NOT NULL CHECK (saldo_pendiente >= 0),
  fecha_credito TEXT NOT NULL,
  fecha_vencimiento TEXT,
  estado_credito TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (
    estado_credito IN ('PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO')
  ),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_venta) REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (
    (origen_credito = 'VENTA' AND id_venta IS NOT NULL AND tipo_deuda_antigua IS NULL)
    OR (origen_credito = 'DEUDA_ANTIGUA' AND id_venta IS NULL AND tipo_deuda_antigua IS NOT NULL)
    OR (origen_credito = 'AJUSTE_MANUAL' AND id_venta IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS detalle_creditos (
  id_detalle_credito TEXT PRIMARY KEY,
  id_credito TEXT NOT NULL,
  id_variante TEXT,
  nombre_producto TEXT NOT NULL,
  sku TEXT,
  talla TEXT,
  color TEXT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_credito) REFERENCES creditos_clientes (id_credito) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto (id_variante) ON UPDATE CASCADE ON DELETE SET NULL,
  CHECK (subtotal = cantidad * precio_unitario)
);

CREATE TABLE IF NOT EXISTS abonos_creditos (
  id_abono TEXT PRIMARY KEY,
  id_credito TEXT NOT NULL,
  id_cliente TEXT NOT NULL,
  id_usuario TEXT NOT NULL,
  valor_abono INTEGER NOT NULL CHECK (valor_abono > 0),
  metodo_pago TEXT NOT NULL CHECK (
    metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'OTRO')
  ),
  referencia_pago TEXT,
  fecha_abono TEXT NOT NULL,
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_credito) REFERENCES creditos_clientes (id_credito) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS ajustes_creditos (
  id_ajuste TEXT PRIMARY KEY,
  id_credito TEXT NOT NULL,
  id_usuario TEXT NOT NULL,
  tipo_ajuste TEXT NOT NULL CHECK (tipo_ajuste IN ('AUMENTO', 'DESCUENTO', 'ANULACION', 'CORRECCION')),
  valor_ajuste INTEGER NOT NULL DEFAULT 0 CHECK (valor_ajuste >= 0),
  -- Estos saldos permiten auditar el efecto exacto del ajuste sobre el credito.
  saldo_antes INTEGER NOT NULL DEFAULT 0 CHECK (saldo_antes >= 0),
  saldo_despues INTEGER NOT NULL DEFAULT 0 CHECK (saldo_despues >= 0),
  motivo TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_credito) REFERENCES creditos_clientes (id_credito) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios (correo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario ON usuarios (nombre_usuario);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (nombre_completo);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes (telefono);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores (nombre_proveedor);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos (estado);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON variantes_producto (id_producto);
CREATE INDEX IF NOT EXISTS idx_variantes_sku ON variantes_producto (sku);
CREATE INDEX IF NOT EXISTS idx_variantes_qr ON variantes_producto (codigo_qr);
CREATE INDEX IF NOT EXISTS idx_variantes_stock ON variantes_producto (stock_actual);
CREATE INDEX IF NOT EXISTS idx_lotes_proveedor ON lotes_entrada (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_lotes_fecha ON lotes_entrada (fecha_lote);
CREATE INDEX IF NOT EXISTS idx_detalle_lote_lote ON detalle_lotes_entrada (id_lote);
CREATE INDEX IF NOT EXISTS idx_movimientos_variante ON movimientos_inventario (id_variante);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario (creado_en);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas (id_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas (creado_en);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON detalle_ventas (id_venta);
CREATE INDEX IF NOT EXISTS idx_creditos_cliente ON creditos_clientes (id_cliente);
CREATE INDEX IF NOT EXISTS idx_creditos_estado ON creditos_clientes (estado_credito);
CREATE INDEX IF NOT EXISTS idx_abonos_credito ON abonos_creditos (id_credito);
