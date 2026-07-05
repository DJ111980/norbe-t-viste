# Ventas

Ventas soportadas:

- CONTADO
- CREDITO
- MIXTA

## CONTADO

Puede registrarse con cliente o como `Cliente general`. Crea pago activo por el
total final y descuenta stock.

## CREDITO

Requiere cliente activo. Crea un credito por el total final, sin pago inicial,
sin abono automatico y descuenta stock.

## MIXTA

Requiere cliente activo, metodo de pago y pago inicial mayor que cero y menor al
total. Crea pago inicial y credito por el saldo restante.

## Descuentos

Los totales se calculan con:

```text
subtotal bruto - descuentos por linea - descuento general = total final
```

Los detalles de venta congelan precio y descuento. En detalle de credito se
conserva subtotal bruto por compatibilidad con restriccion historica de D1; el
saldo real del credito usa el total neto.

## Anulacion

Las ventas no se eliminan. Se marcan como `ANULADA` y el backend coordina stock,
pagos y creditos segun el tipo de venta.
