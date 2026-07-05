# Base De Datos

D1 contiene el modelo relacional. Las migraciones viven en `db/migrations`.

## Migraciones relevantes

- `0001_esquema_inicial.sql`: tablas base.
- `0005_catalogo_auditoria_y_unicidad.sql`: catalogo, auditoria, QR y reglas de imagenes.
- `0006_lotes_inventario_auditoria.sql`: lotes, movimientos y stock.
- `0007_ventas_auditoria_anulacion.sql`: ventas y anulacion.
- `0008_creditos_cartera_auditoria.sql`: creditos, abonos, ajustes y cartera.
- `0009_devoluciones_ventas.sql`: devoluciones parciales.
- `0011_ventas_fecha_local.sql`: fecha comercial local.
- `0012_usuarios_avatar.sql`: avatar de usuarios en R2.
- `0013_remove_referencia_sku.sql`: retira nombres publicos referencia/SKU.

## Reglas

- `variantes_producto.stock_actual` es la fuente de stock.
- `clientes` no guarda deuda directa.
- `detalle_ventas` congela los datos de la venta.
- `detalle_creditos` conserva detalle bruto por restriccion historica; descuentos y saldos viven en ventas y creditos.
- Los campos legacy existen solo para historial interno.

## Comandos

```bash
npm run db:migrate
npm run db:schema
```
