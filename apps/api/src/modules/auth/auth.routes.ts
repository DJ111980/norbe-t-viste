import type { ApiEnv } from '../../config/env';
import { requireAuth } from '../../middleware/auth.middleware';
import { successResponse } from '../../shared/responses';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import { getPublicUser, login } from './auth.service';
import { validateLoginInput } from './auth.validation';

export async function handleAuthRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/auth/login') {
    ensureMethod(request, 'POST');

    const body = await readJsonBody(request);
    const input = validateLoginInput(body);
    const session = await login(env, input);

    return successResponse(session);
  }

  if (url.pathname === '/auth/me') {
    ensureMethod(request, 'GET');

    const auth = await requireAuth(request, env);

    return successResponse({
      user: getPublicUser(auth.user),
    });
  }

  if (url.pathname === '/auth/logout') {
    ensureMethod(request, 'POST');
    await requireAuth(request, env);

    // El JWT actual es stateless: cerrar sesion significa que el cliente debe descartar
    // el token. Si luego necesitamos revocacion real, agregaremos sesiones o blacklist.
    return successResponse({
      loggedOut: true,
    });
  }

  return null;
}
