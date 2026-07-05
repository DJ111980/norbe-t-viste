# Instalacion Local

## Requisitos

- Node.js y npm.
- Wrangler.
- Make opcional.

## Pasos

```bash
npm install
npm run db:migrate
npm run admin:create
```

Crear `apps/api/.dev.vars` con variables locales:

```env
JWT_SECRET=
JWT_EXPIRES_IN=8h
ADMIN_SEED_NAME=
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=
```

Crear `apps/web/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8787
```

## Ejecutar

```bash
npm run dev:api
npm run dev:web
```

Si `8787` o `5173` estan ocupados, liberar el puerto o iniciar con otro puerto
y ajustar `VITE_API_URL`.

## Admin local

El admin local se crea con `npm run admin:create` usando las variables seed.
Estas credenciales son solo de desarrollo y no deben reutilizarse en staging.
