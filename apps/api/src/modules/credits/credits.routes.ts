import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import { createOldDebt, getCreditById, listClientCredits, listCredits } from './credits.service';
import {
  validateCreateOldDebtInput,
  validateListClientCreditsFilters,
  validateListCreditsFilters,
} from './credits.validation';

function matchCreditPath(pathname: string): { idCredito: string } | null {
  const match = pathname.match(/^\/creditos\/([^/]+)$/);

  if (!match || match[1] === 'deuda-antigua') return null;

  return { idCredito: decodeURIComponent(match[1]) };
}

function matchClientCreditsPath(pathname: string): { idCliente: string } | null {
  const match = pathname.match(/^\/clientes\/([^/]+)\/creditos$/);

  if (!match) return null;

  return { idCliente: decodeURIComponent(match[1]) };
}

export async function handleCreditRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const clientCreditsPath = matchClientCreditsPath(url.pathname);
  const creditPath = matchCreditPath(url.pathname);

  if (
    url.pathname !== '/creditos' &&
    url.pathname !== '/creditos/deuda-antigua' &&
    !creditPath &&
    !clientCreditsPath
  ) {
    return null;
  }

  const auth = await requireAuth(request, env);

  if (url.pathname === '/creditos') {
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'GET') {
      return successResponse({
        creditos: await listCredits(env, validateListCreditsFilters(url.searchParams)),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (url.pathname === '/creditos/deuda-antigua') {
    // La deuda antigua carga saldos previos al sistema. Por control contable,
    // solo ADMINISTRADOR puede crearla; VENDEDOR la consultara despues si aplica.
    requireRole(auth, ['ADMINISTRADOR']);

    if (request.method === 'POST') {
      return successResponse(
        {
          credito: await createOldDebt(
            env,
            auth,
            validateCreateOldDebtInput(await readJsonBody(request)),
          ),
        },
        201,
      );
    }

    ensureMethod(request, 'POST');
  }

  if (creditPath) {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        credito: await getCreditById(env, creditPath.idCredito),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (clientCreditsPath) {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        creditos: await listClientCredits(
          env,
          clientCreditsPath.idCliente,
          validateListClientCreditsFilters(url.searchParams),
        ),
      });
    }

    ensureMethod(request, 'GET');
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
