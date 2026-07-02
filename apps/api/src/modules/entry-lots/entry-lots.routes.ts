import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createEntryLot,
  createEntryLotDetail,
  confirmEntryLot,
  deleteEntryLotDetail,
  getEntryLot,
  listEntryLots,
  updateEntryLot,
  updateEntryLotDetail,
} from './entry-lots.service';
import {
  validateCreateEntryLotDetailInput,
  validateCreateEntryLotInput,
  validateListEntryLotsFilters,
  validateUpdateEntryLotDetailInput,
  validateUpdateEntryLotInput,
} from './entry-lots.validation';

function matchEntryLotPath(pathname: string): {
  idLote: string;
  action?: string;
  idDetalle?: string;
} | null {
  const match = pathname.match(/^\/lotes-entrada\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/);

  if (!match) return null;

  return {
    idLote: decodeURIComponent(match[1]),
    action: match[2],
    idDetalle: match[3] ? decodeURIComponent(match[3]) : undefined,
  };
}

export async function handleEntryLotRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/lotes-entrada') {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({
        lotes: await listEntryLots(env, auth, validateListEntryLotsFilters(url.searchParams)),
      });
    }

    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateCreateEntryLotInput(await readJsonBody(request));

      return successResponse({ lote: await createEntryLot(env, auth, input) }, 201);
    }

    ensureMethod(request, 'GET');
  }

  const lotPath = matchEntryLotPath(url.pathname);

  if (!lotPath) return null;

  const auth = await requireAuth(request, env);

  if (!lotPath.action) {
    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      return successResponse({ lote: await getEntryLot(env, auth, lotPath.idLote) });
    }

    if (request.method === 'PATCH') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateUpdateEntryLotInput(await readJsonBody(request));

      return successResponse({ lote: await updateEntryLot(env, auth, lotPath.idLote, input) });
    }
  }

  if (lotPath.action === 'confirmar' && !lotPath.idDetalle) {
    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);

      return successResponse({
        confirmacion: await confirmEntryLot(env, auth, lotPath.idLote),
      });
    }
  }

  if (lotPath.action === 'detalles' && !lotPath.idDetalle) {
    if (request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateCreateEntryLotDetailInput(await readJsonBody(request));

      return successResponse(
        { detalle: await createEntryLotDetail(env, auth, lotPath.idLote, input) },
        201,
      );
    }
  }

  if (lotPath.action === 'detalles' && lotPath.idDetalle) {
    if (request.method === 'PATCH') {
      requireRole(auth, ['ADMINISTRADOR']);

      const input = validateUpdateEntryLotDetailInput(await readJsonBody(request));

      return successResponse({
        detalle: await updateEntryLotDetail(env, auth, lotPath.idLote, lotPath.idDetalle, input),
      });
    }

    if (request.method === 'DELETE') {
      requireRole(auth, ['ADMINISTRADOR']);

      return successResponse({
        detalle: await deleteEntryLotDetail(env, lotPath.idLote, lotPath.idDetalle),
      });
    }
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
