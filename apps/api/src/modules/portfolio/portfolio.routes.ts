import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod } from '../../shared/validation';
import { getClientPortfolio, getPortfolio } from './portfolio.service';
import { validatePortfolioFilters } from './portfolio.validation';

function matchClientPortfolioPath(pathname: string): { idCliente: string } | null {
  const match = pathname.match(/^\/clientes\/([^/]+)\/cartera$/);

  if (!match) return null;

  return { idCliente: decodeURIComponent(match[1]) };
}

export async function handlePortfolioRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  const clientPortfolioPath = matchClientPortfolioPath(url.pathname);

  if (url.pathname !== '/cartera' && !clientPortfolioPath) return null;

  const auth = await requireAuth(request, env);

  if (url.pathname === '/cartera') {
    // La cartera general muestra saldos de todo el negocio, por eso no se delega
    // a VENDEDOR en esta fase consultiva.
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'GET') {
      return successResponse({
        cartera: await getPortfolio(env, validatePortfolioFilters(url.searchParams)),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (clientPortfolioPath) {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        cartera: await getClientPortfolio(env, clientPortfolioPath.idCliente),
      });
    }

    ensureMethod(request, 'GET');
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
