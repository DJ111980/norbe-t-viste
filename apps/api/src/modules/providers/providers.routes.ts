import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createProvider,
  getProvider,
  listProviders,
  updateProvider,
  updateProviderStatus,
} from './providers.service';
import {
  validateCreateProviderInput,
  validateListProvidersFilters,
  validateUpdateProviderInput,
  validateUpdateProviderStatusInput,
} from './providers.validation';

function matchProviderPath(pathname: string): { idProveedor: string; action?: string } | null {
  const match = pathname.match(/^\/proveedores\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) {
    return null;
  }

  return {
    idProveedor: decodeURIComponent(match[1]),
    action: match[2],
  };
}

export async function handleProviderRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/proveedores') {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        proveedores: await listProviders(env, validateListProvidersFilters(url.searchParams)),
      });
    }

    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateCreateProviderInput(await readJsonBody(request));

      return successResponse(
        {
          proveedor: await createProvider(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'GET');
  }

  const providerPath = matchProviderPath(url.pathname);

  if (!providerPath) {
    return null;
  }

  const auth = await requireAuth(request, env);

  if (!providerPath.action) {
    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        proveedor: await getProvider(env, providerPath.idProveedor),
      });
    }

    if (request.method === 'PATCH') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateUpdateProviderInput(await readJsonBody(request));

      return successResponse({
        proveedor: await updateProvider(env, auth, providerPath.idProveedor, input),
      });
    }
  }

  if (providerPath.action === 'estado' && request.method === 'PATCH') {
    requireRole(auth, ['ADMINISTRADOR']);

    const input = validateUpdateProviderStatusInput(await readJsonBody(request));

    return successResponse({
      proveedor: await updateProviderStatus(env, auth, providerPath.idProveedor, input),
    });
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
