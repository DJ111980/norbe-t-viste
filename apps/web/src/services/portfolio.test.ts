import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { getClientPortfolio, getPortfolio } from './portfolio';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('portfolio service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta cartera general con filtros y limite maximo de pantalla', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ cartera: { creditos: [] } });

    await getPortfolio('token', {
      cliente: 'cli_1',
      estado: 'ANULADO',
      origenCredito: 'DEUDA_ANTIGUA',
      fechaDesde: '2026-02-01',
      fechaHasta: '2026-02-28',
      limit: 100,
      offset: 0,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/cartera?limit=100&offset=0&cliente=cli_1&estado=ANULADO&origen_credito=DEUDA_ANTIGUA&fecha_desde=2026-02-01&fecha_hasta=2026-02-28',
      { token: 'token' },
    );
  });

  it('consulta cartera por cliente para roles permitidos por backend', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ cartera: { creditosActivos: [] } });

    await getClientPortfolio('token', 'cli_1');

    expect(apiRequest).toHaveBeenCalledWith('/clientes/cli_1/cartera', { token: 'token' });
  });
});
