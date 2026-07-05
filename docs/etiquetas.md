# Etiquetas

Las etiquetas QR imprimibles usan formato 2.25 x 1.25 pulgadas.

## Reglas

- El QR codifica solo `codigo_qr`.
- No codifica precio, stock, proveedor, cliente ni descripcion.
- El HTML muestra nombre de marca, logo, QR, talla, codigo visible y precio.
- El logo y branding vienen del backend/R2 cuando estan configurados.

## Endpoints

- `GET /etiquetas/variantes/:id/preview`
- `POST /etiquetas/variantes/preview-lote`
- `GET /etiquetas/lotes/:id/preview`

Los previews devuelven HTML imprimible, no PDF.
