# Documentacion NORBE T VISTE

Indice de documentos:

- [Arquitectura](arquitectura.md)
- [Instalacion local](instalacion-local.md)
- [Modulos](modulos.md)
- [API](api.md)
- [Base de datos](base-datos.md)
- [Roles y permisos](roles-permisos.md)
- [Inventario](inventario.md)
- [Ventas](ventas.md)
- [Creditos y cartera](creditos-cartera.md)
- [Etiquetas](etiquetas.md)
- [Branding](branding.md)
- [Deploy staging](deploy-staging.md)
- [Troubleshooting](troubleshooting.md)

NORBE T VISTE es una aplicacion comercial para tienda de ropa. El sistema separa
frontend, API, base de datos y almacenamiento de archivos para mantener reglas
de negocio auditables y listas para Cloudflare.

Comandos base:

```bash
npm install
npm run dev:api
npm run dev:web
npm run check
```

No guardar secretos reales en `docs/`, `README.md` ni archivos trackeados.
