import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { createAccessToken } from './jwt';
import { verifyPassword } from './password';
import { findUserByEmail, updateLastAccess } from './auth.repository';
import type { AuthenticatedUser, LoginInput, UserRecord } from './auth.types';

function toAuthenticatedUser(user: UserRecord): AuthenticatedUser {
  return {
    idUsuario: user.id_usuario,
    nombreCompleto: user.nombre_completo,
    correo: user.correo,
    rol: user.rol,
  };
}

export async function login(env: ApiEnv, input: LoginInput) {
  const user = await findUserByEmail(env, input.correo);

  // El mismo error para correo inexistente o contrasena incorrecta evita filtrar
  // informacion sobre que usuarios existen en el sistema interno.
  if (!user || !(await verifyPassword(input.contrasena, user.contrasena_hash))) {
    throw new ApiError('INVALID_CREDENTIALS', 'Correo o contrasena incorrectos.', 401);
  }

  if (user.estado !== 'ACTIVO') {
    throw new ApiError('USER_INACTIVE', 'El usuario no esta activo.', 403);
  }

  await updateLastAccess(env, user.id_usuario);

  const token = await createAccessToken(env, {
    sub: user.id_usuario,
    correo: user.correo,
    rol: user.rol,
    typ: 'access',
  });

  return {
    token,
    tokenType: 'Bearer',
    user: toAuthenticatedUser(user),
  };
}

export function getPublicUser(user: UserRecord): AuthenticatedUser {
  return toAuthenticatedUser(user);
}
