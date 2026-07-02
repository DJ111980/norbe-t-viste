import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createCategory,
  getCategory,
  listCategories,
  updateCategory,
  updateCategoryStatus,
} from './categories.service';
import {
  validateCreateCategoryInput,
  validateListCategoriesFilters,
  validateUpdateCategoryInput,
  validateUpdateCategoryStatusInput,
} from './categories.validation';

function matchCategoryPath(pathname: string): { idCategoria: string; action?: string } | null {
  const match = pathname.match(/^\/categorias\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) {
    return null;
  }

  return {
    idCategoria: decodeURIComponent(match[1]),
    action: match[2],
  };
}

export async function handleCategoryRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/categorias') {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        categorias: await listCategories(
          env,
          auth,
          validateListCategoriesFilters(url.searchParams),
        ),
      });
    }

    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateCreateCategoryInput(await readJsonBody(request));

      return successResponse(
        {
          categoria: await createCategory(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'GET');
  }

  const categoryPath = matchCategoryPath(url.pathname);

  if (!categoryPath) {
    return null;
  }

  const auth = await requireAuth(request, env);

  if (!categoryPath.action) {
    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        categoria: await getCategory(env, auth, categoryPath.idCategoria),
      });
    }

    if (request.method === 'PATCH') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateUpdateCategoryInput(await readJsonBody(request));

      return successResponse({
        categoria: await updateCategory(env, auth, categoryPath.idCategoria, input),
      });
    }
  }

  if (categoryPath.action === 'estado' && request.method === 'PATCH') {
    requireRole(auth, ['ADMINISTRADOR']);

    const input = validateUpdateCategoryStatusInput(await readJsonBody(request));

    return successResponse({
      categoria: await updateCategoryStatus(env, auth, categoryPath.idCategoria, input),
    });
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
