import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  updateProductStatus,
} from './products.service';
import {
  validateCreateProductInput,
  validateListProductsFilters,
  validateUpdateProductInput,
  validateUpdateProductStatusInput,
} from './products.validation';

function matchProductPath(pathname: string): { idProducto: string; action?: string } | null {
  const match = pathname.match(/^\/productos\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) {
    return null;
  }

  return {
    idProducto: decodeURIComponent(match[1]),
    action: match[2],
  };
}

export async function handleProductRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/productos') {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        productos: await listProducts(env, auth, validateListProductsFilters(url.searchParams)),
      });
    }

    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateCreateProductInput(await readJsonBody(request));

      return successResponse(
        {
          producto: await createProduct(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'GET');
  }

  const productPath = matchProductPath(url.pathname);

  if (!productPath) {
    return null;
  }

  const auth = await requireAuth(request, env);

  if (!productPath.action) {
    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        producto: await getProduct(env, auth, productPath.idProducto),
      });
    }

    if (request.method === 'PATCH') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateUpdateProductInput(await readJsonBody(request));

      return successResponse({
        producto: await updateProduct(env, auth, productPath.idProducto, input),
      });
    }
  }

  if (productPath.action === 'estado' && request.method === 'PATCH') {
    requireRole(auth, ['ADMINISTRADOR']);

    const input = validateUpdateProductStatusInput(await readJsonBody(request));

    return successResponse({
      producto: await updateProductStatus(env, auth, productPath.idProducto, input),
    });
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
