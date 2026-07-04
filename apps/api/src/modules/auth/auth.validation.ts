import { ApiError } from '../../shared/errors';
import type { LoginInput } from './auth.types';

interface RawLoginBody {
  usuario?: unknown;
  nombre_usuario?: unknown;
  correo?: unknown;
  contrasena?: unknown;
}

export function validateLoginInput(body: unknown): LoginInput {
  const rawBody = body as RawLoginBody;
  const rawUsuario =
    typeof rawBody?.usuario === 'string'
      ? rawBody.usuario
      : typeof rawBody?.nombre_usuario === 'string'
        ? rawBody.nombre_usuario
        : typeof rawBody?.correo === 'string'
          ? rawBody.correo
          : '';
  const usuario = rawUsuario.trim().toLowerCase();

  if (
    !rawBody ||
    typeof rawBody.contrasena !== 'string' ||
    usuario.length === 0 ||
    rawBody.contrasena.length === 0
  ) {
    throw new ApiError('INVALID_LOGIN_INPUT', 'Usuario y contrasena son obligatorios.', 400);
  }

  return {
    usuario,
    contrasena: rawBody.contrasena,
  };
}
