# NORBE T VISTE

NORBE T VISTE es una plataforma web de gestion comercial para una tienda de ropa.
Permite administrar clientes, proveedores, categorias, productos, variantes,
lotes de entrada, inventario, ventas, creditos, cartera, devoluciones,
etiquetas QR, reportes, usuarios y branding.

El proyecto fue desarrollado para **NORBE T VISTE** por **Danilo Jose
Castillejo Ponton**.

## Estructura

```text
apps/web      Frontend React + TypeScript + Tailwind
apps/api      API Cloudflare Worker + TypeScript
packages      Codigo compartido
db            Migraciones D1
docs          Documentacion tecnica y funcional
img           Recursos originales de marca
```

## Requisitos

- Node.js compatible con el proyecto.
- npm.
- Wrangler para Cloudflare Workers/D1/R2.
- Make opcional para atajos.

## Instalacion Local

```bash
npm install
npm run db:migrate
npm run admin:create
```

El backend local usa `apps/api/.dev.vars`. Ese archivo no debe subirse a Git.
Variables esperadas:

```env
JWT_SECRET=
JWT_EXPIRES_IN=8h
ADMIN_SEED_NAME=
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=
```

El usuario admin local de desarrollo puede definirse con los valores seed del
entorno local. No guardar secretos reales en el repositorio.

## Correr Local

Backend:

```bash
npm run dev:api
```

Frontend:

```bash
npm run dev:web
```

El frontend necesita `apps/web/.env.local` con:

```env
VITE_API_URL=http://127.0.0.1:8787
```

## Validacion

```bash
npm run format
npm run test -w apps/api
npm run test -w apps/web
npm run build -w apps/web
npm run check
make check
```

## Reglas Criticas

- Producto y variante no son lo mismo.
- El stock real vive en `variantes_producto.stock_actual`.
- Las ventas no se eliminan; se anulan.
- Las deudas viven en creditos, abonos y ajustes, no en clientes.
- El QR codifica solo `codigo_qr`.
- Imagenes, logos y avatares viven en R2; D1 guarda keys.
- La hora comercial usa America/Bogota.

## Documentacion

La documentacion completa esta en [docs/README.md](docs/README.md).
