# Diseno de anulacion para ventas CREDITO y MIXTA

## Alcance de la fase

Este documento define la siguiente fase de anulacion de ventas con cartera para
NORBE T VISTE. No implementa codigo, migraciones ni frontend.

La fase debe extender `POST /ventas/:id/anular`, que hoy solo anula ventas
`CONTADO`, para permitir anulacion automatica de ventas `CREDITO` y `MIXTA`
cuando el credito asociado todavia no tiene movimientos de cartera posteriores.

No incluye:

- devoluciones parciales;
- anulacion independiente de creditos;
- anulacion de abonos;
- anulacion de ajustes;
- recibos, PDF, reportes o etiquetas;
- frontend.

## Regla principal

Una venta `CREDITO` o `MIXTA` se puede anular automaticamente solo si cumple
todas estas condiciones:

- la venta existe;
- `ventas.estado_venta = 'COMPLETADA'`;
- existe exactamente un credito asociado en `creditos_clientes`;
- el credito tiene `origen_credito = 'VENTA'`;
- el credito apunta a la misma venta con `id_venta`;
- el credito no esta anulado;
- no existen abonos activos ni anulados en `abonos_creditos` para ese credito;
- no existen ajustes en `ajustes_creditos` para ese credito.

Si el credito tiene cualquier abono o ajuste, la anulacion automatica debe
bloquearse y exigir manejo manual por `ADMINISTRADOR`. La razon es que ya hubo
intervencion de cartera posterior a la venta y el sistema no debe inventar como
revertir dinero recibido, descuentos, correcciones o aumentos.

## Permisos

Mantener el permiso actual de `POST /ventas/:id/anular`:

- `ADMINISTRADOR`: puede anular ventas cuando pasen las validaciones.
- `VENDEDOR`: no puede anular ventas.

No se requiere una ruta nueva para esta fase.

## Comportamiento por tipo de venta

### CONTADO

Debe conservar el comportamiento existente:

- marcar la venta como `ANULADA`;
- marcar pagos de venta activos como `ANULADO`;
- devolver stock completo por detalle;
- crear movimientos `ANULACION_VENTA`;
- bloquear doble anulacion.

La refactorizacion recomendada es renombrar el servicio de
`cancelCashSale` a un flujo generico como `cancelSale`, dejando una funcion
interna especifica para contado si ayuda a mantener el codigo claro.

### CREDITO

Si el credito asociado no tiene abonos ni ajustes:

- marcar `ventas.estado_venta = 'ANULADA'`;
- guardar `ventas.anulado_por`, `ventas.anulado_en` y `ventas.motivo_anulacion`;
- dejar `ventas.valor_pagado_inicial = 0`;
- dejar `ventas.saldo_pendiente` sin modificar, porque el historial numerico de
  la venta debe conservar la foto original;
- marcar el credito asociado como `ANULADO`;
- guardar `creditos_clientes.anulado_por`, `anulado_en`, `motivo_anulacion`,
  `actualizado_por` y `actualizado_en`;
- poner `creditos_clientes.saldo_pendiente = 0`;
- mantener `creditos_clientes.monto_inicial` y `monto_abonado` como historial;
- no crear pagos de venta;
- no crear abonos;
- no crear ajustes;
- devolver stock completo por cada detalle de venta;
- crear un movimiento `ANULACION_VENTA` por cada detalle.

### MIXTA

Si el credito asociado no tiene abonos ni ajustes:

- marcar `ventas.estado_venta = 'ANULADA'`;
- guardar `ventas.anulado_por`, `ventas.anulado_en` y `ventas.motivo_anulacion`;
- conservar `ventas.total`, `ventas.valor_pagado_inicial` y
  `ventas.saldo_pendiente` como historial original;
- marcar el pago inicial en `pagos_ventas` como `ANULADO`;
- guardar `pagos_ventas.anulado_por`, `anulado_en` y `motivo_anulacion`;
- marcar el credito asociado como `ANULADO`;
- guardar `creditos_clientes.anulado_por`, `anulado_en`, `motivo_anulacion`,
  `actualizado_por` y `actualizado_en`;
- poner `creditos_clientes.saldo_pendiente = 0`;
- mantener `creditos_clientes.monto_inicial` y `monto_abonado` como historial;
- no crear abonos;
- no crear ajustes;
- devolver stock completo por cada detalle de venta;
- crear un movimiento `ANULACION_VENTA` por cada detalle.

## Stock e inventario

La devolucion de stock debe usar siempre `variantes_producto.stock_actual`.
Producto base no participa en stock.

Por cada `detalle_ventas`:

1. leer la variante actual;
2. calcular `stockAntes = variante.stock_actual`;
3. calcular `stockDespues = stockAntes + detalle.cantidad`;
4. actualizar `variantes_producto.stock_actual` con guarda:
   `WHERE id_variante = ? AND stock_actual = ?`;
5. insertar movimiento en `movimientos_inventario`:
   - `tipo_movimiento = 'ANULACION_VENTA'`;
   - `cantidad = detalle.cantidad`;
   - `stock_antes = stockAntes`;
   - `stock_despues = stockDespues`;
   - `referencia_tipo = 'ANULACION_VENTA'`;
   - `referencia_id = idVenta`;
   - `motivo = motivoAnulacion`;
   - `creado_por = usuario administrador`.

No hay riesgo de stock negativo al devolver stock, pero si hay riesgo de carrera:
la guarda por `stock_actual` ayuda a detectar que otro proceso movio la misma
variante entre lectura y escritura.

## Pagos de venta

Para `CREDITO` no debe existir pago en `pagos_ventas`. Si aparece un pago
asociado, la anulacion automatica debe fallar con inconsistencia.

Para `MIXTA` debe existir exactamente un pago inicial activo antes de anular.
La anulacion debe marcar todos los pagos activos de esa venta como `ANULADO`,
pero la validacion previa debe esperar uno solo. Si hay cero o mas de uno, es
mejor bloquear por inconsistencia para revision manual.

No se debe registrar salida de caja ni devolucion de dinero en esta fase; solo se
marca el pago inicial como anulado para conservar auditoria.

## Credito asociado

El credito asociado se identifica por:

```sql
SELECT *
FROM creditos_clientes
WHERE id_venta = ?
  AND origen_credito = 'VENTA';
```

Debe existir exactamente uno. Si hay cero o mas de uno, bloquear con error de
consistencia.

La anulacion automatica solo procede cuando:

```sql
NOT EXISTS (SELECT 1 FROM abonos_creditos WHERE id_credito = ?)
AND NOT EXISTS (SELECT 1 FROM ajustes_creditos WHERE id_credito = ?)
```

La revision incluye abonos anulados porque su sola existencia demuestra que la
cartera ya tuvo operaciones posteriores. Para esta fase se evita decidir si un
abono anulado debe ignorarse o no.

Al anular el credito:

- `estado_credito = 'ANULADO'`;
- `saldo_pendiente = 0`;
- `anulado_por = idUsuario`;
- `anulado_en = datetime('now')`;
- `motivo_anulacion = motivoAnulacion`;
- `actualizado_por = idUsuario`;
- `actualizado_en = datetime('now')`.

No se debe insertar en `ajustes_creditos` para representar esta anulacion. La
tabla `creditos_clientes` ya tiene campos de anulacion y esta fase no debe crear
ajustes automaticos.

## Validaciones

Errores recomendados:

- `SALE_NOT_FOUND`: la venta no existe.
- `SALE_ALREADY_CANCELLED`: la venta ya esta anulada.
- `SALE_NOT_COMPLETED`: la venta no esta completada.
- `SALE_DETAILS_NOT_FOUND`: no hay detalles para devolver stock.
- `SALE_VARIANT_NOT_FOUND`: falta una variante asociada al detalle.
- `SALE_CREDIT_NOT_FOUND`: no existe credito asociado para venta `CREDITO` o
  `MIXTA`.
- `SALE_CREDIT_INCONSISTENT`: hay cero, multiples creditos, pagos inesperados o
  saldo/estado incompatible.
- `SALE_CREDIT_HAS_PAYMENTS`: el credito ya tiene abonos y requiere manejo
  manual.
- `SALE_CREDIT_HAS_ADJUSTMENTS`: el credito ya tiene ajustes y requiere manejo
  manual.
- `SALE_CANCELLATION_NOT_APPLIED`: el batch no dejo persistencia consistente.

Validaciones especificas:

- `CREDITO`:
  - no debe tener pagos de venta;
  - credito asociado debe tener `monto_abonado = 0`;
  - credito asociado debe tener `saldo_pendiente = monto_inicial`;
  - credito asociado debe estar `PENDIENTE`.
- `MIXTA`:
  - debe tener exactamente un pago de venta `ACTIVO`;
  - el pago activo debe coincidir con `ventas.valor_pagado_inicial`;
  - credito asociado debe tener `monto_abonado = 0`;
  - credito asociado debe tener `saldo_pendiente = monto_inicial`;
  - credito asociado debe estar `PENDIENTE`.

Si un credito esta `PARCIAL`, `PAGADO`, `VENCIDO` o ya `ANULADO`, bloquear la
anulacion automatica para revision manual.

## Consistencia en D1

Mantener el patron actual de `env.DB.batch(statements)` con SQL defensivo y
verificacion posterior.

El batch para `CREDITO` y `MIXTA` debe incluir, en este orden logico:

1. actualizar venta a `ANULADA` con guarda `estado_venta = 'COMPLETADA'`;
2. anular pagos de venta activos solo para `MIXTA`;
3. anular credito asociado con guardas de estado, saldo y ausencia de abonos y
   ajustes;
4. por cada detalle, actualizar stock con guarda `stock_actual = stockAntes`;
5. por cada detalle, insertar movimiento `ANULACION_VENTA` condicionado a que la
   venta este anulada y la variante tenga `stockDespues`.

Despues del batch, consultar un estado de persistencia que confirme:

- venta anulada;
- credito anulado;
- credito con saldo pendiente 0;
- cero pagos activos para `MIXTA`;
- cero pagos para `CREDITO`;
- cantidad de movimientos `ANULACION_VENTA` igual a cantidad de detalles;
- stock actual de cada variante igual al `stockDespues` esperado.

Si algo no cuadra, responder `409` con `SALE_CANCELLATION_NOT_APPLIED`.

## Migracion

No parece necesaria una nueva migracion para la anulacion automatica basica:

- `ventas` ya tiene campos de anulacion desde `0007`;
- `pagos_ventas` ya tiene `estado_pago` y campos de anulacion desde `0007`;
- `creditos_clientes` ya tiene campos de anulacion desde `0008`;
- `movimientos_inventario` ya permite `ANULACION_VENTA` desde `0006`;
- `creditos_clientes.estado_credito` ya permite `ANULADO`.

Una migracion futura solo seria necesaria si se decide agregar auditoria mas
explicita, por ejemplo una tabla `anulaciones_ventas` para registrar snapshots
del reverso. No es necesaria para la fase recomendada.

## Pruebas enfocadas recomendadas

Servicio de ventas:

- anula `CREDITO` sin abonos ni ajustes;
- anula `MIXTA` sin abonos ni ajustes;
- `CREDITO` devuelve stock y crea movimientos `ANULACION_VENTA`;
- `MIXTA` devuelve stock, crea movimientos y anula pago inicial;
- ambas marcan credito como `ANULADO` y saldo pendiente en 0;
- bloquea credito con abonos;
- bloquea credito con ajustes;
- bloquea credito inexistente;
- bloquea multiples creditos asociados;
- bloquea doble anulacion;
- bloquea venta sin detalles;
- bloquea variante faltante;
- bloquea resultado inconsistente posterior al batch;
- mantiene comportamiento existente de contado.

Rutas:

- `ADMINISTRADOR` puede anular `CONTADO`, `CREDITO` y `MIXTA`;
- `VENDEDOR` no puede anular;
- sin token no puede anular;
- el cuerpo sigue exigiendo `motivo_anulacion`.

Repositorio:

- consulta credito asociado por venta;
- detecta abonos y ajustes;
- anula credito sin borrar registros;
- anula pago inicial de mixta;
- verifica persistencia final.

## Resultado esperado de la siguiente fase

La siguiente fase debe terminar con `POST /ventas/:id/anular` soportando:

- `CONTADO`: igual que hoy;
- `CREDITO`: anulacion automatica solo si el credito esta limpio;
- `MIXTA`: anulacion automatica solo si el credito esta limpio y el pago inicial
  esta activo.

El resultado debe seguir evitando eliminaciones fisicas, mantener auditoria,
devolver stock por variante y bloquear cualquier caso de cartera ya intervenida
para manejo manual por `ADMINISTRADOR`.
