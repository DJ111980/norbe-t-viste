import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from './users.service';
import {
  validateCreateUserInput,
  validateResetUserPasswordInput,
  validateUpdateUserInput,
  validateUpdateUserStatusInput,
} from './users.validation';

function matchUserPath(pathname: string): { idUsuario: string; action?: string } | null {
  const match = pathname.match(/^\/usuarios\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) {
    return null;
  }

  return {
    idUsuario: decodeURIComponent(match[1]),
    action: match[2],
  };
}

async function requireAdmin(request: Request, env: ApiEnv) {
  const auth = await requireAuth(request, env);
  requireRole(auth, ['ADMINISTRADOR']);
  return auth;
}

export async function handleUserRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/usuarios') {
    const auth = await requireAdmin(request, env);

    if (request.method === 'GET') {
      return successResponse({
        usuarios: await listUsers(env),
      });
    }

    if (request.method === 'POST') {
      const input = validateCreateUserInput(await readJsonBody(request));

      return successResponse(
        {
          usuario: await createUser(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'GET');
  }

  const userPath = matchUserPath(url.pathname);

  if (!userPath) {
    return null;
  }

  const auth = await requireAdmin(request, env);

  if (!userPath.action && request.method === 'GET') {
    return successResponse({
      usuario: await getUser(env, userPath.idUsuario),
    });
  }

  if (!userPath.action && request.method === 'PATCH') {
    const input = validateUpdateUserInput(await readJsonBody(request));

    return successResponse({
      usuario: await updateUser(env, userPath.idUsuario, input),
    });
  }

  if (userPath.action === 'estado' && request.method === 'PATCH') {
    const input = validateUpdateUserStatusInput(await readJsonBody(request));

    return successResponse({
      usuario: await updateUserStatus(env, auth, userPath.idUsuario, input),
    });
  }

  if (userPath.action === 'contrasena' && request.method === 'PATCH') {
    const input = validateResetUserPasswordInput(await readJsonBody(request));

    return successResponse({
      usuario: await resetUserPassword(env, userPath.idUsuario, input),
    });
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
