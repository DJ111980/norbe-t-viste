import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createVariant,
  getVariant,
  getVariantByQr,
  listVariants,
  updateVariant,
  updateVariantStatus,
} from './variants.service';
import {
  validateCreateVariantInput,
  validateListVariantsFilters,
  validateUpdateVariantInput,
  validateUpdateVariantStatusInput,
} from './variants.validation';

function matchVariantPath(pathname: string): { idVariante: string; action?: string } | null {
  const match = pathname.match(/^\/variantes\/([^/]+)(?:\/([^/]+))?$/);

  if (!match || match[1] === 'qr') {
    return null;
  }

  return {
    idVariante: decodeURIComponent(match[1]),
    action: match[2],
  };
}

function matchProductVariantsPath(pathname: string): { idProducto: string } | null {
  const match = pathname.match(/^\/productos\/([^/]+)\/variantes$/);

  if (!match) {
    return null;
  }

  return {
    idProducto: decodeURIComponent(match[1]),
  };
}

export async function handleVariantRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/variantes') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
    ensureMethod(request, 'GET');

    return successResponse({
      variantes: await listVariants(env, auth, validateListVariantsFilters(url.searchParams)),
    });
  }

  if (url.pathname.startsWith('/variantes/qr/')) {
    const codigoQr = decodeURIComponent(url.pathname.replace('/variantes/qr/', ''));
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
    ensureMethod(request, 'GET');

    return successResponse({
      variante: await getVariantByQr(env, auth, codigoQr),
    });
  }

  const productVariantsPath = matchProductVariantsPath(url.pathname);

  if (productVariantsPath) {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
      const filters = validateListVariantsFilters(url.searchParams);

      return successResponse({
        variantes: await listVariants(env, auth, {
          ...filters,
          producto: productVariantsPath.idProducto,
        }),
      });
    }

    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);
      const input = validateCreateVariantInput(await readJsonBody(request));

      return successResponse(
        {
          variante: await createVariant(env, auth, productVariantsPath.idProducto, input),
        },
        201,
      );
    }

    ensureMethod(request, 'GET');
  }

  const variantPath = matchVariantPath(url.pathname);

  if (!variantPath) {
    return null;
  }

  const auth = await requireAuth(request, env);

  if (!variantPath.action) {
    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        variante: await getVariant(env, auth, variantPath.idVariante),
      });
    }

    if (request.method === 'PATCH') {
      requireRole(auth, ['ADMINISTRADOR']);
      const input = validateUpdateVariantInput(await readJsonBody(request));

      return successResponse({
        variante: await updateVariant(env, auth, variantPath.idVariante, input),
      });
    }
  }

  if (variantPath.action === 'estado' && request.method === 'PATCH') {
    requireRole(auth, ['ADMINISTRADOR']);
    const input = validateUpdateVariantStatusInput(await readJsonBody(request));

    return successResponse({
      variante: await updateVariantStatus(env, auth, variantPath.idVariante, input),
    });
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
