import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  cancelCashSale,
  createCashSale,
  getSaleById,
  listSalePayments,
  listSales,
} from './sales.service';
import {
  validateCancelCashSaleInput,
  validateCreateCashSaleInput,
  validateListSalesFilters,
} from './sales.validation';

function matchSalePath(pathname: string): { idVenta: string; action?: string } | null {
  const match = pathname.match(/^\/ventas\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) return null;

  return {
    idVenta: decodeURIComponent(match[1]),
    action: match[2],
  };
}

export async function handleSaleRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== '/ventas' && !matchSalePath(url.pathname)) return null;

  const auth = await requireAuth(request, env);
  requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

  if (url.pathname === '/ventas') {
    if (request.method === 'GET') {
      return successResponse({
        ventas: await listSales(env, auth, validateListSalesFilters(url.searchParams)),
      });
    }

    if (request.method === 'POST') {
      const input = validateCreateCashSaleInput(await readJsonBody(request));

      return successResponse(
        {
          venta: await createCashSale(env, auth, input),
        },
        201,
      );
    }

    throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
  }

  const salePath = matchSalePath(url.pathname);

  if (!salePath) return null;

  if (salePath?.action === undefined) {
    if (request.method === 'GET') {
      return successResponse({
        venta: await getSaleById(env, auth, salePath.idVenta),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (salePath?.action === 'pagos') {
    if (request.method === 'GET') {
      return successResponse({
        pagos: await listSalePayments(env, auth, salePath.idVenta),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (salePath?.action === 'anular') {
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'POST') {
      return successResponse({
        anulacion: await cancelCashSale(
          env,
          auth,
          salePath.idVenta,
          validateCancelCashSaleInput(await readJsonBody(request)),
        ),
      });
    }

    ensureMethod(request, 'POST');
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
