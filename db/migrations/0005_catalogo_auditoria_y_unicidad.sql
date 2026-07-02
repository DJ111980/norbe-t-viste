-- Auditoria de catalogo:
-- Categorias, productos y variantes son datos maestros. Guardar quien crea o
-- actualiza cada registro ayuda a revisar cambios sin mezclar esta migracion
-- con endpoints ni reglas de inventario.
ALTER TABLE categorias
ADD COLUMN creado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE categorias
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE categorias
ADD COLUMN nombre_normalizado TEXT;

ALTER TABLE productos
ADD COLUMN creado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE productos
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE productos
ADD COLUMN nombre_normalizado TEXT;

ALTER TABLE variantes_producto
ADD COLUMN creado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE variantes_producto
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

-- La unicidad de variantes depende del producto y de talla/color normalizados.
-- Cuando la talla viene vacia se usa 'unica', y cuando el color viene vacio se
-- usa 'sin-color', para que productos sin talla o sin color tambien tengan una
-- combinacion estable y no se dupliquen por NULL.
ALTER TABLE variantes_producto
ADD COLUMN talla_normalizada TEXT DEFAULT 'unica';

ALTER TABLE variantes_producto
ADD COLUMN color_normalizado TEXT DEFAULT 'sin-color';

-- Backfill defensivo para instalaciones que ya tengan catalogo.
-- La normalizacion completa se aplicara desde el backend: trim, minusculas y
-- espacios multiples reducidos a uno. Estas expresiones cubren los casos comunes.
UPDATE categorias
SET nombre_normalizado = lower(
  trim(
    replace(
      replace(
        replace(
          replace(nombre_categoria, char(9), ' '),
          '  ',
          ' '
        ),
        '  ',
        ' '
      ),
      '  ',
      ' '
    )
  )
)
WHERE nombre_normalizado IS NULL;

UPDATE productos
SET nombre_normalizado = lower(
  trim(
    replace(
      replace(
        replace(
          replace(nombre_producto, char(9), ' '),
          '  ',
          ' '
        ),
        '  ',
        ' '
      ),
      '  ',
      ' '
    )
  )
)
WHERE nombre_normalizado IS NULL;

UPDATE variantes_producto
SET talla_normalizada = CASE
    WHEN talla IS NULL OR trim(talla) = '' THEN 'unica'
    ELSE lower(
      trim(
        replace(
          replace(
            replace(
              replace(talla, char(9), ' '),
              '  ',
              ' '
            ),
            '  ',
            ' '
          ),
          '  ',
          ' '
        )
      )
    )
  END,
  color_normalizado = CASE
    WHEN color IS NULL OR trim(color) = '' THEN 'sin-color'
    ELSE lower(
      trim(
        replace(
          replace(
            replace(
              replace(color, char(9), ' '),
              '  ',
              ' '
            ),
            '  ',
            ' '
          ),
          '  ',
          ' '
        )
      )
    )
  END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nombre_normalizado_unique
ON categorias (nombre_normalizado)
WHERE nombre_normalizado IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categorias_estado_nombre
ON categorias (estado, nombre_categoria);

CREATE INDEX IF NOT EXISTS idx_productos_nombre_normalizado
ON productos (nombre_normalizado);

CREATE INDEX IF NOT EXISTS idx_productos_categoria_estado
ON productos (id_categoria, estado);

CREATE INDEX IF NOT EXISTS idx_productos_visible_catalogo
ON productos (mostrar_en_catalogo);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variantes_producto_talla_color_unique
ON variantes_producto (id_producto, talla_normalizada, color_normalizado);

CREATE INDEX IF NOT EXISTS idx_variantes_producto_estado
ON variantes_producto (id_producto, estado);

CREATE INDEX IF NOT EXISTS idx_variantes_stock_bajo
ON variantes_producto (stock_actual, stock_minimo);

-- Imagenes y QR:
-- Las imagenes binarias se guardaran en R2; D1 conserva solo keys o rutas como
-- imagen_principal, imagen_variante y ruta_imagen. El QR de una variante guarda
-- solo codigo_qr, un codigo interno tipo NTV-VAR-000001, nunca datos completos
-- del producto, precio o stock. stock_actual sigue viviendo solo en la variante;
-- no se agrega stock al producto base.
-- sku y codigo_qr ya son UNIQUE desde la migracion inicial, por eso no se crean
-- indices unicos duplicados para esas columnas.
