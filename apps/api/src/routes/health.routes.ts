import type { ApiEnv } from '../config/env';
import { checkD1Connection } from '../db/d1';
import { ApiError } from '../shared/errors';
import { successResponse } from '../shared/responses';
import { ensureMethod } from '../shared/validation';

export async function handleHealthRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    ensureMethod(request, 'GET');

    return successResponse({
      service: 'norbe-t-viste-api',
      status: 'healthy',
    });
  }

  if (url.pathname === '/health/db') {
    ensureMethod(request, 'GET');

    const database = await checkD1Connection(env);

    if (!database.connected) {
      throw new ApiError('D1_UNHEALTHY', 'No fue posible validar la conexion con D1.', 503);
    }

    return successResponse({
      service: 'norbe-t-viste-api',
      status: 'healthy',
      database,
    });
  }

  return null;
}
