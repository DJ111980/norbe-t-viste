import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import { validateImageUploadRequest } from '../images/images.validation';
import {
  createUser,
  deleteUserAvatar,
  getUserAvatarFile,
  getUser,
  listUsers,
  resetUserPassword,
  uploadUserAvatar,
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

function matchUserAvatarPath(pathname: string): { idUsuario: string; file: boolean } | null {
  const match = pathname.match(/^\/usuarios\/([^/]+)\/avatar(?:\/(file))?$/);
  if (!match) return null;

  return {
    idUsuario: decodeURIComponent(match[1]),
    file: match[2] === 'file',
  };
}

async function requireAdmin(request: Request, env: ApiEnv) {
  const auth = await requireAuth(request, env);
  requireRole(auth, ['ADMINISTRADOR']);
  return auth;
}

async function requireAdminOrSelf(request: Request, env: ApiEnv, idUsuario: string) {
  const auth = await requireAuth(request, env);

  if (auth.user.rol !== 'ADMINISTRADOR' && auth.user.id_usuario !== idUsuario) {
    throw new ApiError('FORBIDDEN', 'No tienes permisos para realizar esta accion.', 403);
  }

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

  const avatarPath = matchUserAvatarPath(url.pathname);

  if (avatarPath) {
    if (request.method === 'GET') {
      await requireAdminOrSelf(request, env, avatarPath.idUsuario);

      if (avatarPath.file) {
        return getUserAvatarFile(env, avatarPath.idUsuario);
      }

      return successResponse({
        usuario: await getUser(env, avatarPath.idUsuario),
      });
    }

    if (!avatarPath.file && (request.method === 'POST' || request.method === 'PUT')) {
      await requireAdmin(request, env);
      const input = await validateImageUploadRequest(request);

      return successResponse(
        {
          usuario: await uploadUserAvatar(env, avatarPath.idUsuario, input),
        },
        201,
      );
    }

    if (!avatarPath.file && request.method === 'DELETE') {
      await requireAdmin(request, env);
      return successResponse({
        usuario: await deleteUserAvatar(env, avatarPath.idUsuario),
      });
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
