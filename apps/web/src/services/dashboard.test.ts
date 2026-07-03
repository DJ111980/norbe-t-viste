import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { getDashboardSummary } from './dashboard';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('dashboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta resumen sin filtros', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ resumen: { ventas: {} } });

    await getDashboardSummary('token');

    expect(apiRequest).toHaveBeenCalledWith('/dashboard/resumen', { token: 'token' });
  });

  it('consulta resumen con rango de fechas', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ resumen: { ventas: {} } });

    await getDashboardSummary('token', {
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-31',
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/dashboard/resumen?fecha_desde=2026-01-01&fecha_hasta=2026-01-31',
      { token: 'token' },
    );
  });
});
