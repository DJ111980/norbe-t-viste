import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import { createSaleReturn, listSaleReturns } from './returns.service';
import { validateCreateSaleReturnInput } from './returns.validation';

function matchSaleReturnsPath(pathname: string): { idVenta: string } | null {
  const match = pathname.match(/^\/ventas\/([^/]+)\/devoluciones$/);

  if (!match) return null;

  return { idVenta: decodeURIComponent(match[1]) };
}

export async function handleReturnRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const saleReturnsPath = matchSaleReturnsPath(url.pathname);

  if (!saleReturnsPath) return null;

  const auth = await requireAuth(request, env);

  if (request.method === 'POST') {
    requireRole(auth, ['ADMINISTRADOR']);

    return successResponse(
      {
        devolucion: await createSaleReturn(
          env,
          auth,
          saleReturnsPath.idVenta,
          validateCreateSaleReturnInput(await readJsonBody(request)),
        ),
      },
      201,
    );
  }

  if (request.method === 'GET') {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    return successResponse({
      devoluciones: await listSaleReturns(env, saleReturnsPath.idVenta),
    });
  }

  ensureMethod(request, 'GET');
  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
