# Troubleshooting

## Falta VITE_API_URL

Crear `apps/web/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8787
```

## API no levanta

Verificar `apps/api/.dev.vars`, puerto `8787` y migraciones locales.

```bash
npm run dev:api
npm run db:migrate
```

## Login falla

El login usa usuario/correo y `contrasena` en backend. Crear admin local con:

```bash
npm run admin:create
```

## R2 no configurado

Imagenes, logo y avatares requieren binding `BUCKET`. En local Wrangler usa R2
local si esta configurado en `wrangler.toml`.

## Error de stock

El stock se calcula desde variantes. Si una venta falla por stock, confirmar que
el lote fue confirmado o que existe ajuste de inventario.

## Ventas CREDITO/MIXTA

CREDITO y MIXTA requieren cliente activo porque generan cartera. CONTADO puede
usar Cliente general.
