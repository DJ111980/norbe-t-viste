# Deploy Staging

No desplegar sin revisar esta lista.

## Preparacion

- Crear recursos Cloudflare reales para staging.
- Configurar D1 remoto.
- Configurar R2 remoto.
- Configurar variables y secretos con Wrangler/Cloudflare, no en Git.
- Ejecutar migraciones remotas.
- Crear admin de staging con credenciales propias.
- Confirmar `CORS_ORIGINS` para el dominio de staging.

## Validacion previa

```bash
npm run format
npm run test -w apps/api
npm run test -w apps/web
npm run build -w apps/web
npm run check
make check
```

## Pendientes habituales

- Revisar bucket R2.
- Revisar politicas de acceso.
- Revisar dominio y variables del frontend.
- Probar login, ventas, etiquetas, branding y reportes.
