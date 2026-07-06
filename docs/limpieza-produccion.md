# Limpieza de produccion

## Objetivo

Eliminar datos demo de produccion sin tocar staging, recursos Cloudflare, migraciones, branding
ni administradores reales.

## Script

Usar solo despues de crear backup:

```powershell
$env:CLEAN_PRODUCTION_DEMO_DATA="1"
.\scripts\clean-production-demo-data.ps1
```

El script imprime un resumen antes de borrar:

- categorias demo
- proveedores demo
- productos demo
- variantes demo
- lotes demo
- clientes demo
- ventas demo
- creditos demo
- devoluciones demo
- vendedores demo
- objetos R2 demo referenciados por D1

## Conserva

- administradores reales
- branding
- configuracion Cloudflare
- migraciones
- secrets

## Si hay duda

No borrar manualmente. Crear un backup nuevo y revisar el registro antes de ejecutar limpieza.
