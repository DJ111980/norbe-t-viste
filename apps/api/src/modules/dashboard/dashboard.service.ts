import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import * as dashboardRepository from './dashboard.repository';
import type { DashboardDateRange, DashboardSummary } from './dashboard.types';

export async function getDashboardSummary(
  env: ApiEnv,
  auth: AuthContext,
  range: DashboardDateRange,
): Promise<DashboardSummary> {
  const idUsuario = auth.user.rol === 'VENDEDOR' ? auth.user.id_usuario : undefined;

  const [ventas, pagos, cartera, inventario, devoluciones, lotes, alertas] = await Promise.all([
    dashboardRepository.getSalesSummary(env, range, idUsuario),
    dashboardRepository.getPaymentsSummary(env, range, idUsuario),
    dashboardRepository.getPortfolioSummary(env),
    dashboardRepository.getInventorySummary(env),
    dashboardRepository.getReturnsSummary(env, range),
    dashboardRepository.getEntryLotsSummary(env),
    dashboardRepository.getAlertsSummary(env),
  ]);

  return {
    periodo: range,
    ventas,
    pagos,
    cartera,
    inventario,
    devoluciones,
    lotes,
    alertas,
  };
}
