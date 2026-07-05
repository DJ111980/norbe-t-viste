-- Retira los nombres publicos referencia/sku sin reconstruir tablas padre.
-- D1 aplica migraciones con claves foraneas activas, por eso se renombran las
-- columnas antiguas a campos legacy no usados por la aplicacion.

DROP INDEX IF EXISTS idx_variantes_sku;

ALTER TABLE productos
RENAME COLUMN referencia TO codigo_producto_legacy;

ALTER TABLE variantes_producto
RENAME COLUMN sku TO codigo_variante_legacy;

ALTER TABLE detalle_ventas
RENAME COLUMN sku TO codigo_variante_legacy;

ALTER TABLE detalle_creditos
RENAME COLUMN sku TO codigo_variante_legacy;
