# API

La API responde JSON con forma estable:

```json
{ "ok": true, "data": {} }
```

Errores:

```json
{ "ok": false, "error": { "code": "CODE", "message": "Mensaje" } }
```

## Endpoints principales

- `POST /auth/login`
- `GET /auth/me`
- `GET /dashboard/resumen`
- `GET|POST /clientes`
- `GET|POST /proveedores`
- `GET|POST /categorias`
- `GET|POST /productos`
- `GET|POST /productos/:id/variantes`
- `GET|PATCH /variantes/:id`
- `GET /inventario/variantes`
- `GET /inventario/movimientos`
- `GET|POST /lotes-entrada`
- `POST /lotes-entrada/:id/confirmar`
- `POST /lotes-entrada/:id/anular`
- `GET|POST /ventas`
- `GET /ventas/:id`
- `GET /ventas/:id/pagos`
- `POST /ventas/:id/anular`
- `GET|POST /creditos`
- `GET /cartera`
- `GET /clientes/:id/cartera`
- `GET|POST /devoluciones`
- `GET /etiquetas/variantes/:id/preview`
- `POST /etiquetas/variantes/preview-lote`
- `POST /etiquetas/lotes/:id/preview`
- `GET /reportes/*`
- `GET|PATCH /branding`
- `POST /branding/logo`
- `GET|POST /usuarios`

## Autenticacion

Usa `Authorization: Bearer <token>`. Los roles soportados son
`ADMINISTRADOR` y `VENDEDOR`.
