# Arquitectura

NORBE T VISTE es un monorepo con dos aplicaciones principales:

```text
apps/web      React, TypeScript, Tailwind CSS
apps/api      Cloudflare Worker, TypeScript
db            Migraciones Cloudflare D1
packages      Codigo compartido
docs          Documentacion
img           Logos originales
```

## Backend

La API corre como Cloudflare Worker. Cada modulo separa rutas, validacion,
servicio, repositorio, tipos, mapper y pruebas cuando aplica.

## Frontend

El frontend consume la API por `VITE_API_URL`. La UI contiene pantallas para
operacion interna: ventas, lotes, inventario, cartera, reportes, etiquetas,
usuarios y branding.

## Datos y archivos

- D1 guarda datos relacionales.
- R2 guarda binarios: logos, imagenes de productos/variantes y avatares.
- D1 solo guarda keys de R2.

## Reglas transversales

- El stock se modifica desde backend.
- El QR codifica solo `codigo_qr`.
- Las ventas calculan totales con descuentos en backend.
- La hora comercial usa America/Bogota.
