import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { successResponse } from '../../shared/responses';
import { ensureMethod } from '../../shared/validation';
import { getDashboardSummary } from './dashboard.service';
import { validateDashboardDateRange } from './dashboard.validation';

export async function handleDashboardRoutes(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== '/dashboard/resumen') return null;

  const auth = await requireAuth(request, env);
  requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
  ensureMethod(request, 'GET');

  return successResponse({
    resumen: await getDashboardSummary(env, auth, validateDashboardDateRange(url.searchParams)),
  });
}
