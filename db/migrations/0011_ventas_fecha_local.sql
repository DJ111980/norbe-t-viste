-- NORBE T VISTE - Fecha comercial local para ventas.
-- El esquema inicial ya contiene fecha_venta; se conserva el backfill y el indice.

UPDATE ventas
SET fecha_venta = COALESCE(fecha_venta, creado_en)
WHERE fecha_venta IS NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_fecha_venta
ON ventas (fecha_venta);
