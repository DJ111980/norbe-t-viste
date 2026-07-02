# NORBE T VISTE

Plataforma web PWA para la gestion comercial de **NORBE T VISTE**, desarrollada por **Danilo Jose Castillejo Ponton**.

El proyecto esta pensado como un sistema real para administrar clientes, proveedores, productos, variantes por talla y color, lotes de entrada, inventario, ventas, creditos, abonos, imagenes, codigos QR por variante y reportes basicos.

## Arquitectura Inicial

La arquitectura base propuesta es cloud-first serverless:

```text
apps/web  -> React + TypeScript + Tailwind CSS + PWA
apps/api  -> Cloudflare Workers + TypeScript
db        -> Migraciones y seeds para Cloudflare D1
R2        -> Imagenes de productos, variantes, logos y QR
D1        -> Datos relacionales y rutas/keys de archivos
```

## Estructura

```text
norbe-t-viste/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   │   └── branding/
│   │   └── src/
│   └── api/
│       └── src/
├── packages/
│   └── shared/
│       └── src/
├── db/
│   ├── migrations/
│   └── seeds/
├── docs/
├── img/
├── .env.example
├── Makefile
├── package.json
└── README.md
```

## Comandos

Instalar dependencias:

```bash
npm install
```

Ejecutar desarrollo web:

```bash
npm run dev
```

Formatear:

```bash
npm run format
```

Validar formato, lint, tipos, pruebas y build:

```bash
npm run check
```

Los mismos comandos existen como atajos en `Makefile`:

```bash
make install
make dev
make format
make lint
make test
make build
make check
```

En Windows, `make` puede ejecutarse desde Git Bash, WSL o Make para Windows. Si no esta disponible, usar directamente `npm run ...`.

Crear el primer administrador local:

```bash
npm run admin:create
```

O con Make:

```bash
make admin-create
```

## Variables De Entorno

Copiar `.env.example` a `.env` cuando sea necesario y completar valores reales solo en el entorno local o en Cloudflare.

No se deben guardar secretos, tokens, IDs reales privados ni credenciales dentro del repositorio.

Para el Worker local, Wrangler puede leer secretos desde `apps/api/.dev.vars`. Ese archivo esta ignorado por Git. Para crear el primer administrador local se requieren:

```env
ADMIN_SEED_NAME=
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=8h
```

La contrasena inicial debe tener minimo 8 caracteres, al menos una letra y al menos un numero.

## Branding

La carpeta `img/` contiene los recursos originales del logo y una nota `LEEME.txt`.

Segun esa nota:

- Logo general web recomendado: `NORBE_T_VISTE_web_512_transparente.png`.
- Logo web de mayor calidad: `NORBE_T_VISTE_web_1024_transparente.png`.
- Favicon recomendado: `NORBE_T_VISTE_favicon_32_transparente.png` o version 64.
- Etiquetas pequenas: `NORBE_T_VISTE_etiqueta_128_transparente.png` o version 256.
- Archivo maestro: `NORBE_T_VISTE_circular_borde_rojo_transparente_HD.png`.

En una fase posterior, con autorizacion, estos recursos deben organizarse en `apps/web/public/branding/` y conservar la documentacion de uso del logo.

## Reglas Tecnicas Base

- Las imagenes no se guardan en D1; se guardan en R2 y en D1 solo queda la ruta o key.
- El API espera un binding de R2 llamado `BUCKET`. El bucket real se configura en Cloudflare/Wrangler y no debe inventarse ni guardarse con credenciales reales en el repositorio.
- El stock pertenece a variantes, no a productos.
- El QR es por variante de producto, no por unidad fisica.
- Las ventas no se eliminan; se anulan.
- Los productos con historial no se eliminan; se desactivan.
- Las deudas se manejan con creditos, abonos y ajustes, no como campo directo del cliente.
- Los comentarios tecnicos del codigo deben estar en espanol y explicar reglas de negocio o decisiones no evidentes.

## Estado Actual

Esta fase solo crea la estructura inicial, documentacion y configuracion de herramientas. No hay modulos de negocio implementados todavia.
