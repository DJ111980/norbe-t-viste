# Manual de administracion

## Usuarios

- Crear vendedores reales desde el modulo Usuarios.
- Asignar rol VENDEDOR salvo que la persona administre el sistema.
- Inactivar usuarios que ya no deban entrar.
- Cambiar contrasenas desde la opcion de usuario.

## Branding

Administrar nombre, eslogan y logo desde Marca del negocio. No borrar el logo real sin tener
una copia validada.

## Administradores reales

Produccion debe conservar administradores reales activos. El admin temporal solo debe quedar
como respaldo si se decide conservarlo.

## Seguridad

- No guardar contrasenas en documentos del repo.
- Usar contrasenas fuertes.
- Revisar permisos de vendedor antes de entregar cuentas.
- Mantener `JWT_SECRET` como secret de Cloudflare.
