# Branding

Branding administra datos publicos de marca y logo.

## Logo

El binario del logo vive en R2. D1 guarda la key interna. El frontend no debe
usar rutas locales para mostrar el logo real de negocio.

## Recursos originales

La carpeta `img/` contiene recursos originales y una nota `LEEME.txt`. No se
debe borrar ni mover sin una fase explicita de organizacion.

## Endpoints

- `GET /branding`
- `PATCH /branding`
- `POST /branding/logo`
- `GET /branding/logo/file`
- `DELETE /branding/logo`
