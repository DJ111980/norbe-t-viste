import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  DashboardAlertsSummary,
  DashboardDateRange,
  DashboardEntryLotsSummary,
  DashboardInventorySummary,
  DashboardPaymentsSummary,
  DashboardPortfolioSummary,
  DashboardReturnsSummary,
  DashboardSalesSummary,
} from './dashboard.types';

const mocks = vi.hoisted(() => ({
  requestedSeller: undefined as string | undefined,
  sales: {
    cantidad_total: 2,
    total_vendido: 100000,
    total_contado: 50000,
    total_credito: 30000,
    total_mixto: 20000,
    ventas_anuladas: 1,
  } satisfies DashboardSalesSummary,
  payments: { total_recibido: 70000 } satisfies DashboardPaymentsSummary,
  portfolio: {
    saldo_pendiente_total: 80000,
    creditos_pendientes: 1,
    creditos_pagados: 1,
    creditos_anulados: 1,
  } satisfies DashboardPortfolioSummary,
  inventory: {
    variantes_total: 4,
    variantes_activas: 3,
    stock_total: 12,
    variantes_sin_stock: 1,
    variantes_bajo_stock: 2,
  } satisfies DashboardInventorySummary,
  returns: { cantidad_total: 1, total_devuelto: 10000 } satisfies DashboardReturnsSummary,
  lots: {
    lotes_borrador: 1,
    lotes_confirmados: 2,
    lotes_anulados: 1,
  } satisfies DashboardEntryLotsSummary,
  alerts: {
    variantes_sin_qr: 1,
    variantes_sin_imagen: 2,
    productos_sin_imagen: 1,
    creditos_con_saldo: 2,
  } satisfies DashboardAlertsSummary,
}));

vi.mock('./dashboard.repository', () => ({
  getSalesSummary: vi.fn(async (_env: ApiEnv, _range: DashboardDateRange, idUsuario?: string) => {
    mocks.requestedSeller = idUsuario;
    return mocks.sales;
  }),
  getPaymentsSummary: vi.fn(async () => mocks.payments),
  getPortfolioSummary: vi.fn(async () => mocks.portfolio),
  getInventorySummary: vi.fn(async () => mocks.inventory),
  getReturnsSummary: vi.fn(async () => mocks.returns),
  getEntryLotsSummary: vi.fn(async () => mocks.lots),
  getAlertsSummary: vi.fn(async () => mocks.alerts),
}));

const { getDashboardSummary } = await import('./dashboard.service');

const env = {} as ApiEnv;
const range = {
  fechaDesde: '2026-07-03T00:00:00.000Z',
  fechaHasta: '2026-07-03T23:59:59.999Z',
};

describe('dashboard service', () => {
  beforeEach(() => {
    mocks.requestedSeller = undefined;
  });

  it('calcula resumen para ADMINISTRADOR sin limitar vendedor', async () => {
    const auth = {
      user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' },
    } as AuthContext;

    const resumen = await getDashboardSummary(env, auth, range);

    expect(resumen.ventas.total_vendido).toBe(100000);
    expect(resumen.cartera.saldo_pendiente_total).toBe(80000);
    expect(resumen.inventario.stock_total).toBe(12);
    expect(resumen.devoluciones.total_devuelto).toBe(10000);
    expect(mocks.requestedSeller).toBeUndefined();
  });

  it('limita ventas de VENDEDOR a su usuario', async () => {
    const auth = {
      user: { id_usuario: 'usr_seller', rol: 'VENDEDOR' },
    } as AuthContext;

    await getDashboardSummary(env, auth, range);

    expect(mocks.requestedSeller).toBe('usr_seller');
  });
});
