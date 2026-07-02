import { ApiError } from '../../shared/errors';
import type { LoginInput } from './auth.types';

interface RawLoginBody {
  correo?: unknown;
  contrasena?: unknown;
}

export function validateLoginInput(body: unknown): LoginInput {
  const rawBody = body as RawLoginBody;

  if (
    !rawBody ||
    typeof rawBody.correo !== 'string' ||
    typeof rawBody.contrasena !== 'string' ||
    rawBody.correo.trim().length === 0 ||
    rawBody.contrasena.length === 0
  ) {
    throw new ApiError('INVALID_LOGIN_INPUT', 'Correo y contrasena son obligatorios.', 400);
  }

  return {
    correo: rawBody.correo.trim().toLowerCase(),
    contrasena: rawBody.contrasena,
  };
}
