# Roles Y Permisos

## ADMINISTRADOR

Puede gestionar catalogo, inventario, ventas, creditos, cartera general,
reportes, usuarios y branding.

## VENDEDOR

Puede operar flujos comerciales permitidos como consulta, ventas y modulos de
trabajo diario. La cartera general queda reservada para administrador; cartera
por cliente puede consultarse cuando el backend lo permite.

## Seguridad

- Todas las rutas de negocio requieren JWT.
- No se deben hardcodear usuarios, contrasenas ni tokens.
- El frontend oculta acciones no permitidas, pero la autoridad final es el backend.
