import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import {
  createClient,
  getClient,
  listClients,
  updateClient,
  updateClientStatus,
} from './clients.service';
import {
  validateCreateClientInput,
  validateListClientsFilters,
  validateUpdateClientInput,
  validateUpdateClientStatusInput,
} from './clients.validation';

function matchClientPath(pathname: string): { idCliente: string; action?: string } | null {
  const match = pathname.match(/^\/clientes\/([^/]+)(?:\/([^/]+))?$/);

  if (!match) {
    return null;
  }

  return {
    idCliente: decodeURIComponent(match[1]),
    action: match[2],
  };
}

export async function handleClientRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/clientes') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        clientes: await listClients(env, validateListClientsFilters(url.searchParams)),
      });
    }

    if (request.method === 'POST') {
      const input = validateCreateClientInput(await readJsonBody(request));

      return successResponse(
        {
          cliente: await createClient(env, auth, input),
        },
        201,
      );
    }

    ensureMethod(request, 'GET');
  }

  const clientPath = matchClientPath(url.pathname);

  if (!clientPath) {
    return null;
  }

  const auth = await requireAuth(request, env);

  if (!clientPath.action) {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

    if (request.method === 'GET') {
      return successResponse({
        cliente: await getClient(env, clientPath.idCliente),
      });
    }

    if (request.method === 'PATCH') {
      const input = validateUpdateClientInput(await readJsonBody(request));

      return successResponse({
        cliente: await updateClient(env, auth, clientPath.idCliente, input),
      });
    }
  }

  if (clientPath.action === 'estado' && request.method === 'PATCH') {
    requireRole(auth, ['ADMINISTRADOR']);

    const input = validateUpdateClientStatusInput(await readJsonBody(request));

    return successResponse({
      cliente: await updateClientStatus(env, auth, clientPath.idCliente, input),
    });
  }

  throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
}
