import { apiRequest } from '../lib/api';
import type { DashboardFilters, DashboardSummary } from '../types';

interface DashboardResponse {
  resumen: DashboardSummary;
}

export async function getDashboardSummary(
  token: string,
  filters: Partial<DashboardFilters> = {},
): Promise<DashboardSummary> {
  const params = new URLSearchParams();

  if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);

  const query = params.toString();
  const data = await apiRequest<DashboardResponse>(
    `/dashboard/resumen${query ? `?${query}` : ''}`,
    { token },
  );

  return data.resumen;
}
