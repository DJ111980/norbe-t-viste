import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import {
  getEntryLotsReport,
  getInventoryMovementReport,
  getInventoryReport,
  getPortfolioReport,
  getReturnsReport,
  getSalesReport,
} from './reports';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('reports service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta reporte de ventas con filtros y paginacion', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ reporte: { items: [] } });

    await getSalesReport('token', {
      page: 2,
      page_size: 25,
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-31',
      tipo_venta: 'CONTADO',
      estado_venta: 'COMPLETADA',
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/reportes/ventas?page=2&page_size=25&fecha_desde=2026-01-01&fecha_hasta=2026-01-31&tipo_venta=CONTADO&estado_venta=COMPLETADA',
      { token: 'token' },
    );
  });

  it('consulta reportes principales sin acciones de escritura', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ reporte: { items: [] } });

    await getInventoryReport('token', { q: 'camisa', page: 1, page_size: 10 });
    await getInventoryMovementReport('token', { tipo_movimiento: 'VENTA', page: 1, page_size: 10 });
    await getPortfolioReport('token', { estado_credito: 'PENDIENTE', page: 1, page_size: 10 });
    await getReturnsReport('token', { estado_devolucion: 'ACTIVA', page: 1, page_size: 10 });
    await getEntryLotsReport('token', { estado_lote: 'CONFIRMADO', page: 1, page_size: 10 });

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      '/reportes/inventario?page=1&page_size=10&q=camisa',
      {
        token: 'token',
      },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      '/reportes/movimientos-inventario?page=1&page_size=10&tipo_movimiento=VENTA',
      { token: 'token' },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      '/reportes/cartera?page=1&page_size=10&estado_credito=PENDIENTE',
      { token: 'token' },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      '/reportes/devoluciones?page=1&page_size=10&estado_devolucion=ACTIVA',
      { token: 'token' },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      5,
      '/reportes/lotes-entrada?page=1&page_size=10&estado_lote=CONFIRMADO',
      { token: 'token' },
    );
  });
});
