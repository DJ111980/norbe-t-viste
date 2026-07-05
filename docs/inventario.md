# Inventario

El stock real vive en `variantes_producto.stock_actual`. Producto base no tiene
stock.

## Entradas

Los lotes de entrada empiezan en `BORRADOR`. Al confirmarse:

- aumentan stock por variante.
- crean movimientos de inventario.
- actualizan costo de compra interno de la variante.

El costo de compra unitario es obligatorio y mayor que cero.

## Ajustes

Los ajustes de inventario pasan por backend y crean movimiento. No se debe
editar stock directo desde frontend.

## Movimientos

Cada movimiento guarda tipo, cantidad, stock antes, stock despues, motivo,
referencia tipo y referencia id.
