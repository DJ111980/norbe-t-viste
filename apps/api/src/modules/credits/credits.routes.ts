import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createCreditAdjustment,
  createCreditPayment,
  createOldDebt,
  getCreditById,
  listClientCredits,
  listCredits,
} from './credits.service';
import {
  validateCreateCreditAdjustmentInput,
  validateCreateCreditPaymentInput,
  validateCreateOldDebtInput,
  validateListClientCreditsFilters,
  validateListCreditsFilters,
} from './credits.validation';

function matchCreditPath(pathname: string): { idCredito: string; action: string | null } | null {
  const match = pathname.match(/^\/creditos\/([^/]+)(?:\/([^/]+))?$/);

  if (!match || match[1] === 'deuda-antigua') return null;

  return { idCredito: decodeURIComponent(match[1]), action: match[2] ?? null };
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

    if (creditPath.action === 'ajustes') {
      // Los ajustes cambian cartera sin entrada de dinero real; por control
      // administrativo no se delegan a VENDEDOR en esta fase.
      requireRole(auth, ['ADMINISTRADOR']);

      if (request.method === 'POST') {
        return successResponse(
          {
            ajuste: await createCreditAdjustment(
              env,
              auth,
              creditPath.idCredito,
              validateCreateCreditAdjustmentInput(await readJsonBody(request)),
            ),
          },
          201,
        );
      }

      ensureMethod(request, 'POST');
    }

    if (creditPath.action === 'abonos') {
      if (request.method === 'POST') {
        return successResponse(
          {
            abono: await createCreditPayment(
              env,
              auth,
              creditPath.idCredito,
              validateCreateCreditPaymentInput(await readJsonBody(request)),
            ),
          },
          201,
        );
      }

      ensureMethod(request, 'POST');
    }

    if (creditPath.action === null && request.method === 'GET') {
      return successResponse({
        credito: await getCreditById(env, creditPath.idCredito),
      });
    }

    ensureMethod(request, creditPath.action === null ? 'GET' : 'POST');
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
