import { jwtVerify, SignJWT } from 'jose';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { USER_ROLES, type AccessTokenClaims, type UserRole } from './auth.types';

const DEFAULT_EXPIRES_IN = '8h';
const JWT_ISSUER = 'norbe-t-viste-api';

function getJwtSecret(env: ApiEnv): Uint8Array {
  if (!env.JWT_SECRET) {
    throw new ApiError('AUTH_CONFIG_MISSING', 'La configuracion JWT no esta disponible.', 500);
  }

  return new TextEncoder().encode(env.JWT_SECRET);
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

export async function createAccessToken(env: ApiEnv, claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({
    correo: claims.correo,
    rol: claims.rol,
    typ: claims.typ,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN)
    .sign(getJwtSecret(env));
}

export async function verifyAccessToken(env: ApiEnv, token: string): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(env), {
      issuer: JWT_ISSUER,
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.correo !== 'string' ||
      !isUserRole(payload.rol) ||
      payload.typ !== 'access'
    ) {
      throw new ApiError('INVALID_TOKEN', 'El token de acceso no es valido.', 401);
    }

    return {
      sub: payload.sub,
      correo: payload.correo,
      rol: payload.rol,
      typ: 'access',
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('INVALID_TOKEN', 'El token de acceso no es valido.', 401);
  }
}
