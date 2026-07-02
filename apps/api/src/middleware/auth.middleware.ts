import type { ApiEnv } from '../config/env';
import { findUserById } from '../modules/auth/auth.repository';
import type { UserRecord, UserRole } from '../modules/auth/auth.types';
import { verifyAccessToken } from '../modules/auth/jwt';
import { ApiError } from '../shared/errors';

export interface AuthContext {
  user: UserRecord;
}

function readBearerToken(request: Request): string {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError('AUTH_REQUIRED', 'Debes iniciar sesion para acceder a esta ruta.', 401);
  }

  return authorization.slice('Bearer '.length).trim();
}

export async function requireAuth(request: Request, env: ApiEnv): Promise<AuthContext> {
  const token = readBearerToken(request);
  const claims = await verifyAccessToken(env, token);
  const user = await findUserById(env, claims.sub);

  if (!user || user.estado !== 'ACTIVO') {
    throw new ApiError('AUTH_REQUIRED', 'Debes iniciar sesion para acceder a esta ruta.', 401);
  }

  return { user };
}

export function requireRole(auth: AuthContext, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(auth.user.rol)) {
    throw new ApiError('FORBIDDEN', 'No tienes permisos para realizar esta accion.', 403);
  }
}
