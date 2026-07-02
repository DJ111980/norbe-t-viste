import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  getInventoryVariant,
  listInventoryMovements,
  listInventoryVariants,
  registerInitialInventory,
  registerManualInventoryAdjustment,
} from './inventory.service';
import {
  validateListInventoryMovementsFilters,
  validateListInventoryVariantsFilters,
  validateManualInventoryAdjustmentInput,
  validateRegisterInitialInventoryInput,
} from './inventory.validation';

function matchInventoryVariantPath(
  pathname: string,
): { idVariante: string; action?: string } | null {
  const match = pathname.match(/^\/inventario\/variantes\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) return null;

  return {
    idVariante: decodeURIComponent(match[1]),
    action: match[2],
  };
}

export async function handleInventoryRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/inventario/variantes') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        variantes: await listInventoryVariants(
          env,
          auth,
          validateListInventoryVariantsFilters(url.searchParams),
        ),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (url.pathname === '/inventario/movimientos') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'GET') {
      return successResponse({
        movimientos: await listInventoryMovements(
          env,
          validateListInventoryMovementsFilters(url.searchParams),
        ),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (url.pathname === '/inventario/inicial') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'POST') {
      const input = validateRegisterInitialInventoryInput(await readJsonBody(request));

      return successResponse(
        {
          inventarioInicial: await registerInitialInventory(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'POST');
  }

  if (url.pathname === '/inventario/ajustes') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'POST') {
      const input = validateManualInventoryAdjustmentInput(await readJsonBody(request));

      return successResponse(
        {
          ajuste: await registerManualInventoryAdjustment(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'POST');
  }

  const variantPath = matchInventoryVariantPath(url.pathname);

  if (!variantPath) return null;

  const auth = await requireAuth(request, env);

  if (!variantPath.action) {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        variante: await getInventoryVariant(env, auth, variantPath.idVariante),
      });
    }
  }

  if (variantPath.action === 'movimientos') {
    // Los movimientos pueden revelar compras y ajustes internos; por ahora solo
    // ADMINISTRADOR puede consultar este historial.
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'GET') {
      return successResponse({
        movimientos: await listInventoryMovements(env, {
          ...validateListInventoryMovementsFilters(url.searchParams),
          variante: variantPath.idVariante,
        }),
      });
    }
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
