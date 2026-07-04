import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  deleteLogo,
  getBranding,
  getLogo,
  getLogoFile,
  updateBranding,
  uploadLogo,
} from './branding.service';
import { validateLogoUploadRequest, validateUpdateBrandingInput } from './branding.validation';

export async function handleBrandingRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/branding') {
    if (request.method === 'GET') {
      return successResponse({
        branding: await getBranding(env),
      });
    }

    if (request.method === 'PATCH') {
      const auth = await requireAuth(request, env);
      requireRole(auth, ['ADMINISTRADOR']);
      const input = validateUpdateBrandingInput(await readJsonBody(request));

      return successResponse({
        branding: await updateBranding(env, input),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (url.pathname === '/branding/logo') {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        logo: await getLogo(env),
      });
    }

    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);
      const input = await validateLogoUploadRequest(request);

      return successResponse(
        {
          logo: await uploadLogo(env, input),
        },
        201,
      );
    }

    if (request.method === 'DELETE') {
      requireRole(auth, ['ADMINISTRADOR']);

      return successResponse({
        logo: await deleteLogo(env),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (url.pathname === '/branding/logo/file') {
    ensureMethod(request, 'GET');

    return getLogoFile(env);
  }

  if (url.pathname.startsWith('/branding/')) {
    throw new ApiError('NOT_FOUND', 'La ruta solicitada no existe.', 404);
  }

  return null;
}
