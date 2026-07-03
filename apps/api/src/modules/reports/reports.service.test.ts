import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';

const mocks = vi.hoisted(() => ({
  forcedUserId: undefined as string | undefined,
}));

vi.mock('./reports.repository', () => ({
  listSales: vi.fn(async (_env: ApiEnv, _filters, forcedUserId?: string) => {
    mocks.forcedUserId = forcedUserId;
    return [{ id_venta: 'ven_1', estado_venta: 'COMPLETADA', total: 100000 }];
  }),
  getSalesTotals: vi.fn(async () => ({
    cantidad_total: 1,
    total_vendido: 100000,
    ventas_anuladas: 1,
  })),
  countSales: vi.fn(async () => 1),
  listInventory: vi.fn(async () => [{ id_variante: 'var_1', stock_actual: 2 }]),
  getInventoryTotals: vi.fn(async () => ({ variantes_total: 1, stock_total: 2 })),
  countInventory: vi.fn(async () => 1),
  listInventoryMovements: vi.fn(async () => [{ id_movimiento: 'mov_1' }]),
  getInventoryMovementTotals: vi.fn(async () => ({ cantidad_movimientos: 1 })),
  countInventoryMovements: vi.fn(async () => 1),
  listPortfolio: vi.fn(async () => [{ id_credito: 'cre_1', estado_credito: 'PENDIENTE' }]),
  getPortfolioTotals: vi.fn(async () => ({
    cantidad_creditos: 1,
    saldo_activo: 50000,
    monto_original: 100000,
  })),
  countPortfolio: vi.fn(async () => 1),
  listReturns: vi.fn(async () => [{ id_devolucion: 'dev_1' }]),
  getReturnsTotals: vi.fn(async () => ({
    cantidad_total: 1,
    total_devuelto: 10000,
    impacto_credito: 10000,
    impacto_pago: 0,
  })),
  countReturns: vi.fn(async () => 1),
  listEntryLots: vi.fn(async () => [{ id_lote: 'lot_1' }]),
  getEntryLotsTotals: vi.fn(async () => ({
    cantidad_lotes: 1,
    total_compra: 10000,
    cantidad_detalles: 2,
  })),
  countEntryLots: vi.fn(async () => 1),
}));

const {
  getEntryLotsReport,
  getInventoryMovementReport,
  getInventoryReport,
  getPortfolioReport,
  getReturnsReport,
  getSalesReport,
} = await import('./reports.service');

const env = {} as ApiEnv;
const basePagination = { page: 1, pageSize: 50, limit: 50, offset: 0 };

describe('reports service', () => {
  it('pagina reporte de ventas y limita vendedor a su usuario', async () => {
    const auth = {
      user: { id_usuario: 'usr_seller', rol: 'VENDEDOR' },
    } as AuthContext;

    const report = await getSalesReport(env, auth, basePagination);

    expect(report.paginacion).toMatchObject({ page: 1, page_size: 50, total_items: 1 });
    expect(report.totales.total_vendido).toBe(100000);
    expect(mocks.forcedUserId).toBe('usr_seller');
  });

  it('pagina reportes administrativos principales', async () => {
    const inventory = await getInventoryReport(env, basePagination);
    const movements = await getInventoryMovementReport(env, basePagination);
    const portfolio = await getPortfolioReport(env, basePagination);
    const returns = await getReturnsReport(env, basePagination);
    const lots = await getEntryLotsReport(env, basePagination);

    expect(inventory.totales.stock_total).toBe(2);
    expect(movements.totales.cantidad_movimientos).toBe(1);
    expect(portfolio.totales.saldo_activo).toBe(50000);
    expect(returns.totales.total_devuelto).toBe(10000);
    expect(lots.totales.cantidad_detalles).toBe(2);
  });
});
