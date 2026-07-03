import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { successResponse } from '../../shared/responses';
import { ensureMethod } from '../../shared/validation';
import {
  getEntryLotsReport,
  getInventoryMovementReport,
  getInventoryReport,
  getPortfolioReport,
  getReturnsReport,
  getSalesReport,
} from './reports.service';
import {
  validateEntryLotsReportFilters,
  validateInventoryMovementReportFilters,
  validateInventoryReportFilters,
  validatePortfolioReportFilters,
  validateReturnsReportFilters,
  validateSalesReportFilters,
} from './reports.validation';

export async function handleReportRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/reportes/')) return null;

  const auth = await requireAuth(request, env);
  ensureMethod(request, 'GET');

  if (url.pathname === '/reportes/ventas') {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
    return successResponse({
      reporte: await getSalesReport(env, auth, validateSalesReportFilters(url.searchParams)),
    });
  }

  if (url.pathname === '/reportes/inventario') {
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
    return successResponse({
      reporte: await getInventoryReport(env, validateInventoryReportFilters(url.searchParams)),
    });
  }

  if (url.pathname === '/reportes/movimientos-inventario') {
    requireRole(auth, ['ADMINISTRADOR']);
    return successResponse({
      reporte: await getInventoryMovementReport(
        env,
        validateInventoryMovementReportFilters(url.searchParams),
      ),
    });
  }

  if (url.pathname === '/reportes/cartera') {
    requireRole(auth, ['ADMINISTRADOR']);
    return successResponse({
      reporte: await getPortfolioReport(env, validatePortfolioReportFilters(url.searchParams)),
    });
  }

  if (url.pathname === '/reportes/devoluciones') {
    requireRole(auth, ['ADMINISTRADOR']);
    return successResponse({
      reporte: await getReturnsReport(env, validateReturnsReportFilters(url.searchParams)),
    });
  }

  if (url.pathname === '/reportes/lotes-entrada') {
    requireRole(auth, ['ADMINISTRADOR']);
    return successResponse({
      reporte: await getEntryLotsReport(env, validateEntryLotsReportFilters(url.searchParams)),
    });
  }

  return null;
}
