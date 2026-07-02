# AGENTS.md — NORBE T VISTE

## Contexto Permanente

Este proyecto es una plataforma web real para **NORBE T VISTE**, desarrollada por **Danilo Jose Castillejo Ponton**.

Antes de implementar cambios funcionales, revisar los documentos base del proyecto y respetar estas reglas:

- Trabajar en fases pequenas, verificables y faciles de revisar.
- No inventar credenciales, dominios, buckets, tokens, IDs reales ni configuraciones privadas.
- No implementar modulos de negocio sin autorizacion explicita de la fase correspondiente.
- Mantener separadas interfaz, reglas de negocio, acceso a datos y servicios externos.
- Usar React, TypeScript, Tailwind CSS, Cloudflare Workers, Cloudflare D1 y Cloudflare R2.
- Usar comandos `npm run ...` y atajos `make`.
- Mantener comentarios tecnicos en espanol cuando expliquen reglas importantes.

## Reglas De Negocio Criticas

- Producto y variante no son lo mismo.
- El stock real vive en `variantes_producto.stock_actual`.
- El QR se genera por variante y guarda solo un codigo interno.
- Las imagenes se guardan en R2; D1 solo almacena rutas o keys.
- Las ventas no se eliminan; se marcan como `ANULADA`.
- Los productos con historial no se eliminan; se marcan como `INACTIVO`.
- Las deudas no se guardan directamente en clientes; se manejan con creditos, abonos y ajustes.

## Branding

La carpeta `img/` contiene los logos originales y `LEEME.txt`. Antes de definir identidad visual, favicon, login, dashboard, recibos, etiquetas QR o catalogo, revisar esa nota y las imagenes.

No mover ni borrar `img/` sin confirmar que los archivos fueron organizados correctamente. En este monorepo la ubicacion final recomendada para recursos publicos es:

```text
apps/web/public/branding/
```

## Estructura Esperada

```text
apps/web      Interfaz React
apps/api      API Cloudflare Worker
packages      Codigo compartido
db            Migraciones y seeds D1
docs          Documentacion tecnica y funcional
img           Recursos originales del logo antes de organizarlos
```

## Validacion

Antes de cerrar una fase de codigo, ejecutar cuando aplique:

```bash
npm run format
npm run check
```

Si algun comando no puede ejecutarse, explicar la causa y que validacion manual queda pendiente.
