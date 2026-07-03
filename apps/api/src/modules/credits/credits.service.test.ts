import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  CreditClientRecord,
  CreditDetailViewRecord,
  CreditRecord,
  ListClientCreditsFilters,
  ListCreditsFilters,
} from './credits.types';

const mocks = vi.hoisted(() => ({
  clients: [] as CreditClientRecord[],
  credits: [] as CreditRecord[],
  details: [] as unknown[],
  payments: [] as unknown[],
  adjustments: [] as unknown[],
  sales: [] as unknown[],
  inventoryMovements: [] as unknown[],
  lastListFilters: undefined as ListCreditsFilters | undefined,
  lastClientFilters: undefined as ListClientCreditsFilters | undefined,
}));

function buildClient(overrides: Partial<CreditClientRecord> = {}): CreditClientRecord {
  return {
    id_cliente: 'cli_1',
    nombre_completo: 'Cliente Uno',
    documento: '123',
    telefono: '300',
    estado: 'ACTIVO',
    ...overrides,
  };
}

function buildCredit(overrides: Partial<CreditRecord> = {}): CreditRecord {
  return {
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    id_venta: null,
    id_usuario: 'usr_admin',
    origen_credito: 'DEUDA_ANTIGUA',
    tipo_deuda_antigua: 'SOLO_MONTO',
    descripcion_credito: 'Deuda vieja',
    monto_inicial: 150000,
    monto_abonado: 0,
    saldo_pendiente: 150000,
    fecha_credito: '2026-07-02',
    fecha_vencimiento: null,
    estado_credito: 'PENDIENTE',
    observaciones: 'Deuda vieja',
    creado_en: '2026-07-02',
    actualizado_en: '2026-07-02',
    actualizado_por: 'usr_admin',
    anulado_por: null,
    anulado_en: null,
    motivo_anulacion: null,
    cliente_nombre: 'Cliente Uno',
    cliente_documento: '123',
    cliente_telefono: '300',
    ...overrides,
  };
}

vi.mock('./credits.repository', () => ({
  findClientForCredit: vi.fn(async (_env: ApiEnv, idCliente: string) => {
    return mocks.clients.find((client) => client.id_cliente === idCliente) ?? null;
  }),
  listCredits: vi.fn(async (_env: ApiEnv, filters: ListCreditsFilters) => {
    mocks.lastListFilters = filters;
    return mocks.credits.filter((credit) => {
      if (filters.cliente && credit.id_cliente !== filters.cliente) return false;
      if (filters.estado && credit.estado_credito !== filters.estado) return false;
      if (filters.origenCredito && credit.origen_credito !== filters.origenCredito) return false;
      if (filters.saldoPendiente === true && credit.saldo_pendiente <= 0) return false;
      return true;
    });
  }),
  listCreditsByClient: vi.fn(
    async (_env: ApiEnv, idCliente: string, filters: ListClientCreditsFilters) => {
      mocks.lastClientFilters = filters;
      return mocks.credits.filter((credit) => credit.id_cliente === idCliente);
    },
  ),
  getCreditDetailView: vi.fn(async (_env: ApiEnv, idCredito: string) => {
    const credit = mocks.credits.find((item) => item.id_credito === idCredito);
    if (!credit) return null;
    return {
      ...credit,
      venta: null,
      detalles: [],
      abonos: [],
      ajustes: [],
    } satisfies CreditDetailViewRecord;
  }),
  createOldDebtCredit: vi.fn(async (_env: ApiEnv, idCredito: string, input, userId: string) => {
    const client = mocks.clients.find((item) => item.id_cliente === input.idCliente);
    const credit = buildCredit({
      id_credito: idCredito,
      id_cliente: input.idCliente,
      id_usuario: userId,
      tipo_deuda_antigua: input.tipoDeudaAntigua,
      descripcion_credito: input.descripcion,
      monto_inicial: input.montoInicial,
      monto_abonado: 0,
      saldo_pendiente: input.montoInicial,
      observaciones: input.descripcion,
      actualizado_por: userId,
      cliente_nombre: client?.nombre_completo ?? 'Cliente',
      cliente_documento: client?.documento ?? null,
      cliente_telefono: client?.telefono ?? null,
    });
    mocks.credits.push(credit);
    return credit;
  }),
}));

const { createOldDebt, getCreditById, listClientCredits, listCredits } =
  await import('./credits.service');

const env = {} as ApiEnv;
const adminAuth = { user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' } } as AuthContext;

describe('credits service', () => {
  beforeEach(() => {
    mocks.clients = [
      buildClient(),
      buildClient({ id_cliente: 'cli_inactivo', estado: 'INACTIVO' }),
    ];
    mocks.credits = [buildCredit()];
    mocks.details = [];
    mocks.payments = [];
    mocks.adjustments = [];
    mocks.sales = [];
    mocks.inventoryMovements = [];
    mocks.lastListFilters = undefined;
    mocks.lastClientFilters = undefined;
  });

  it('lista creditos aplicando filtros', async () => {
    mocks.credits.push(
      buildCredit({ id_credito: 'cre_2', estado_credito: 'PAGADO', saldo_pendiente: 0 }),
    );

    const result = await listCredits(env, {
      estado: 'PENDIENTE',
      saldoPendiente: true,
      limit: 50,
      offset: 0,
    });

    expect(result).toHaveLength(1);
    expect(mocks.lastListFilters).toMatchObject({ estado: 'PENDIENTE', limit: 50 });
  });

  it('consulta credito por id con detalle', async () => {
    const credit = await getCreditById(env, 'cre_1');

    expect(credit).toMatchObject({
      idCredito: 'cre_1',
      resumen: {
        montoInicial: 150000,
        montoAbonado: 0,
        saldoPendiente: 150000,
        estadoCredito: 'PENDIENTE',
      },
    });
  });

  it('credito inexistente responde error claro', async () => {
    await expect(getCreditById(env, 'missing')).rejects.toMatchObject({
      code: 'CREDIT_NOT_FOUND',
      status: 404,
    });
  });

  it('consulta creditos de cliente y valida existencia', async () => {
    const result = await listClientCredits(env, 'cli_1', { limit: 50, offset: 0 });

    expect(result).toHaveLength(1);
    expect(mocks.lastClientFilters).toMatchObject({ limit: 50, offset: 0 });

    await expect(listClientCredits(env, 'missing', { limit: 50, offset: 0 })).rejects.toMatchObject(
      {
        code: 'CLIENT_NOT_FOUND',
      },
    );
  });

  it('ADMINISTRADOR registra deuda antigua sin crear ventas ni mover inventario', async () => {
    mocks.credits = [];

    const result = await createOldDebt(env, adminAuth, {
      idCliente: 'cli_1',
      montoInicial: 150000,
      descripcion: 'Deuda vieja',
      tipoDeudaAntigua: 'SOLO_MONTO',
    });

    expect(result).toMatchObject({
      origen_credito: 'DEUDA_ANTIGUA',
      monto_abonado: 0,
      saldo_pendiente: 150000,
      estado_credito: 'PENDIENTE',
    });
    expect(mocks.credits[0]).toMatchObject({
      origen_credito: 'DEUDA_ANTIGUA',
      id_venta: null,
      monto_abonado: 0,
      saldo_pendiente: 150000,
    });
    expect(mocks.sales).toHaveLength(0);
    expect(mocks.payments).toHaveLength(0);
    expect(mocks.adjustments).toHaveLength(0);
    expect(mocks.inventoryMovements).toHaveLength(0);
  });

  it('deuda antigua rechaza cliente inexistente o inactivo', async () => {
    await expect(
      createOldDebt(env, adminAuth, {
        idCliente: 'missing',
        montoInicial: 1000,
        descripcion: 'x',
        tipoDeudaAntigua: 'SOLO_MONTO',
      }),
    ).rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' });

    await expect(
      createOldDebt(env, adminAuth, {
        idCliente: 'cli_inactivo',
        montoInicial: 1000,
        descripcion: 'x',
        tipoDeudaAntigua: 'SOLO_MONTO',
      }),
    ).rejects.toMatchObject({ code: 'CLIENT_INACTIVE' });
  });
});
