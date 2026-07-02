import type { ApiEnv } from './config/env';
import { handleAuthRoutes } from './modules/auth/auth.routes';
import { handleClientRoutes } from './modules/clients/clients.routes';
import { handleProviderRoutes } from './modules/providers/providers.routes';
import { handleUserRoutes } from './modules/users/users.routes';
import { ApiError, normalizeApiError } from './shared/errors';
import { errorResponse } from './shared/responses';
import { handleHealthRoutes } from './routes/health.routes';

async function handleRequest(request: Request, env: ApiEnv): Promise<Response> {
  const providerResponse = await handleProviderRoutes(request, env);

  if (providerResponse) {
    return providerResponse;
  }

  const clientResponse = await handleClientRoutes(request, env);

  if (clientResponse) {
    return clientResponse;
  }

  const userResponse = await handleUserRoutes(request, env);

  if (userResponse) {
    return userResponse;
  }

  const authResponse = await handleAuthRoutes(request, env);

  if (authResponse) {
    return authResponse;
  }

  const healthResponse = await handleHealthRoutes(request, env);

  if (healthResponse) {
    return healthResponse;
  }

  throw new ApiError('NOT_FOUND', 'La ruta solicitada no existe.', 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      // Centralizar errores desde el inicio evita que cada modulo de negocio invente
      // su propio formato de fallo cuando agreguemos autenticacion, ventas o creditos.
      return errorResponse(normalizeApiError(error));
    }
  },
} satisfies ExportedHandler<ApiEnv>;
