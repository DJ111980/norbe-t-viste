import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type {
  PortfolioClientRecord,
  PortfolioCreditRecord,
  PortfolioPaymentRecord,
  PortfolioSummaryRecord,
} from './portfolio.types';

const mocks = vi.hoisted(() => ({
  clients: [] as PortfolioClientRecord[],
  credits: [] as PortfolioCreditRecord[],
  lastPayment: null as PortfolioPaymentRecord | null,
  summary: {
    total_creditos: 0,
    creditos_pendientes: 0,
    creditos_parciales: 0,
    creditos_pagados: 0,
    creditos_anulados: 0,
    total_monto_inicial: 0,
    total_monto_abonado: 0,
    total_saldo_pendiente: 0,
    clientes_con_deuda: 0,
  } as PortfolioSummaryRecord,
  createdCredits: 0,
  createdPayments: 0,
  createdAdjustments: 0,
  inventoryChanges: 0,
  movements: 0,
}));

vi.mock('./portfolio.repository', () => ({
  getPortfolioSummary: vi.fn(async () => mocks.summary),
  listPortfolioCredits: vi.fn(async () => mocks.credits),
  findClient: vi.fn(async (_env: ApiEnv, idCliente: string) => {
    return mocks.clients.find((client) => client.id_cliente === idCliente) ?? null;
  }),
  listClientPortfolioCredits: vi.fn(async (_env: ApiEnv, idCliente: string) => {
    return mocks.credits.filter((credit) => credit.id_cliente === idCliente);
  }),
  findLastClientPayment: vi.fn(async () => mocks.lastPayment),
}));

const { getClientPortfolio, getPortfolio } = await import('./portfolio.service');

const env = {} as ApiEnv;

function buildCredit(overrides: Partial<PortfolioCreditRecord> = {}): PortfolioCreditRecord {
  return {
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    id_venta: null,
    origen_credito: 'DEUDA_ANTIGUA',
    descripcion_credito: 'Deuda',
    monto_inicial: 100000,
    monto_abonado: 0,
    saldo_pendiente: 100000,
    fecha_credito: '2026-07-02',
    estado_credito: 'PENDIENTE',
    cliente_nombre: 'Cliente Uno',
    cliente_documento: '123',
    cliente_telefono: '300',
    ...overrides,
  };
}

describe('portfolio service', () => {
  beforeEach(() => {
    mocks.clients = [
      {
        id_cliente: 'cli_1',
        nombre_completo: 'Cliente Uno',
        documento: '123',
        telefono: '300',
        estado: 'ACTIVO',
      },
    ];
    mocks.credits = [buildCredit()];
    mocks.summary = {
      total_creditos: 2,
      creditos_pendientes: 1,
      creditos_parciales: 0,
      creditos_pagados: 0,
      creditos_anulados: 1,
      total_monto_inicial: 150000,
      total_monto_abonado: 0,
      total_saldo_pendiente: 100000,
      clientes_con_deuda: 1,
    };
    mocks.lastPayment = null;
    mocks.createdCredits = 0;
    mocks.createdPayments = 0;
    mocks.createdAdjustments = 0;
    mocks.inventoryChanges = 0;
    mocks.movements = 0;
  });

  it('consulta cartera general sin modificar datos', async () => {
    const result = await getPortfolio(env, { limit: 50, offset: 0 });

    expect(result.resumen).toMatchObject({
      totalCreditos: 2,
      totalSaldoPendiente: 100000,
      creditosAnulados: 1,
    });
    expect(result.creditos).toHaveLength(1);
    expect(mocks.createdCredits).toBe(0);
    expect(mocks.createdPayments).toBe(0);
    expect(mocks.createdAdjustments).toBe(0);
    expect(mocks.inventoryChanges).toBe(0);
    expect(mocks.movements).toBe(0);
  });

  it('consulta cartera por cliente con creditos activos, pagados y anulados', async () => {
    mocks.credits = [
      buildCredit({ estado_credito: 'PENDIENTE' }),
      buildCredit({ id_credito: 'cre_2', estado_credito: 'PARCIAL', saldo_pendiente: 50000 }),
      buildCredit({ id_credito: 'cre_3', estado_credito: 'PAGADO', saldo_pendiente: 0 }),
      buildCredit({ id_credito: 'cre_4', estado_credito: 'ANULADO', saldo_pendiente: 80000 }),
    ];
    mocks.lastPayment = {
      id_abono: 'abo_1',
      id_credito: 'cre_2',
      valor_abono: 50000,
      metodo_pago: 'NEQUI',
      fecha_abono: '2026-07-03',
      creado_en: '2026-07-03',
    };

    const result = await getClientPortfolio(env, 'cli_1');

    expect(result.resumen.totalSaldoPendiente).toBe(150000);
    expect(result.creditosActivos).toHaveLength(2);
    expect(result.creditosPagados).toHaveLength(1);
    expect(result.creditosAnulados).toHaveLength(1);
    expect(result.ultimoAbono?.idAbono).toBe('abo_1');
  });

  it('rechaza cliente inexistente', async () => {
    await expect(getClientPortfolio(env, 'missing')).rejects.toMatchObject({
      code: 'CLIENT_NOT_FOUND',
      status: 404,
    });
  });
});
