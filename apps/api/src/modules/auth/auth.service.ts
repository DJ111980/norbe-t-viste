import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { createAccessToken } from './jwt';
import { verifyPassword } from './password';
import { findUserByLogin, updateLastAccess } from './auth.repository';
import type { AuthenticatedUser, LoginInput, UserRecord } from './auth.types';

function toAuthenticatedUser(user: UserRecord): AuthenticatedUser {
  return {
    idUsuario: user.id_usuario,
    nombreCompleto: user.nombre_completo,
    nombreUsuario: user.nombre_usuario,
    correo: user.correo,
    rol: user.rol,
  };
}

export async function login(env: ApiEnv, input: LoginInput) {
  const user = await findUserByLogin(env, input.usuario);

  // El mismo error para correo inexistente o contrasena incorrecta evita filtrar
  // informacion sobre que usuarios existen en el sistema interno.
  if (!user || !(await verifyPassword(input.contrasena, user.contrasena_hash))) {
    throw new ApiError('INVALID_CREDENTIALS', 'Usuario o contrasena incorrectos.', 401);
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
