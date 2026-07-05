# Creditos Y Cartera

Los clientes no guardan deuda directa. La deuda vive en:

- `creditos_clientes`
- `abonos_creditos`
- `ajustes_creditos`

## Origenes

- `VENTA`: credito creado desde venta CREDITO o MIXTA.
- `DEUDA_ANTIGUA`: deuda registrada manualmente.

## Estados

- `PENDIENTE`
- `PARCIAL`
- `PAGADO`
- `ANULADO`

Creditos anulados no suman deuda activa salvo filtros explicitos cuando el
endpoint lo soporta.

## Cartera

`GET /cartera` consulta cartera general y esta reservado a administrador.
`GET /clientes/:id/cartera` consulta cartera de un cliente.
