import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  CreditAdjustmentRecord,
  CreditClientRecord,
  CreditDetailViewRecord,
  CreditPaymentRecord,
  CreditRecord,
  ListClientCreditsFilters,
  ListCreditsFilters,
} from './credits.types';

const mocks = vi.hoisted(() => ({
  clients: [] as CreditClientRecord[],
  credits: [] as CreditRecord[],
  details: [] as unknown[],
  payments: [] as CreditPaymentRecord[],
  adjustments: [] as CreditAdjustmentRecord[],
  sales: [] as unknown[],
  salePayments: [] as unknown[],
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

function buildPayment(overrides: Partial<CreditPaymentRecord> = {}): CreditPaymentRecord {
  return {
    id_abono: 'abo_1',
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    id_usuario: 'usr_admin',
    valor_abono: 50000,
    metodo_pago: 'EFECTIVO',
    referencia_pago: null,
    fecha_abono: '2026-07-02',
    observaciones: 'Abono',
    creado_en: '2026-07-02',
    estado_abono: 'ACTIVO',
    anulado_en: null,
    motivo_anulacion: null,
    usuario_nombre: 'Admin',
    ...overrides,
  };
}

function buildAdjustment(overrides: Partial<CreditAdjustmentRecord> = {}): CreditAdjustmentRecord {
  return {
    id_ajuste: 'aju_1',
    id_credito: 'cre_1',
    id_usuario: 'usr_admin',
    tipo_ajuste: 'AUMENTO',
    valor_ajuste: 10000,
    saldo_antes: 150000,
    saldo_despues: 160000,
    motivo: 'Ajuste',
    creado_en: '2026-07-02',
    usuario_nombre: 'Admin',
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
  findCreditById: vi.fn(async (_env: ApiEnv, idCredito: string) => {
    const credit = mocks.credits.find((item) => item.id_credito === idCredito);
    return credit ? { ...credit } : null;
  }),
  getCreditDetailView: vi.fn(async (_env: ApiEnv, idCredito: string) => {
    const credit = mocks.credits.find((item) => item.id_credito === idCredito);
    if (!credit) return null;
    return {
      ...credit,
      venta: null,
      detalles: [],
      abonos: mocks.payments.filter((payment) => payment.id_credito === idCredito),
      ajustes: mocks.adjustments.filter((adjustment) => adjustment.id_credito === idCredito),
    } satisfies CreditDetailViewRecord;
  }),
  countCreditActivity: vi.fn(async (_env: ApiEnv, idCredito: string) => {
    return {
      paymentsCount: mocks.payments.filter((payment) => payment.id_credito === idCredito).length,
      adjustmentsCount: mocks.adjustments.filter(
        (adjustment) => adjustment.id_credito === idCredito,
      ).length,
    };
  }),
  cancelCredit: vi.fn(async (_env: ApiEnv, input) => {
    const credit = mocks.credits.find((item) => item.id_credito === input.idCredito);

    if (!credit) return;
    if (
      credit.estado_credito === 'ANULADO' ||
      credit.origen_credito !== 'DEUDA_ANTIGUA' ||
      credit.id_venta !== null ||
      credit.saldo_pendiente !== input.saldoAnterior ||
      credit.monto_inicial !== input.montoInicial ||
      credit.monto_abonado !== input.montoAbonado ||
      mocks.payments.some((payment) => payment.id_credito === input.idCredito) ||
      mocks.adjustments.some((adjustment) => adjustment.id_credito === input.idCredito)
    ) {
      return;
    }

    credit.estado_credito = 'ANULADO';
    credit.saldo_pendiente = 0;
    credit.anulado_por = input.idUsuario;
    credit.anulado_en = '2026-07-03 11:00:00';
    credit.motivo_anulacion = input.motivoAnulacion;
    credit.actualizado_por = input.idUsuario;
  }),
  getCreditCancellationPersistenceStatus: vi.fn(async (_env: ApiEnv, idCredito: string) => {
    const credit = mocks.credits.find((item) => item.id_credito === idCredito);

    return {
      creditSaldoPendiente: credit?.saldo_pendiente ?? null,
      creditMontoInicial: credit?.monto_inicial ?? null,
      creditMontoAbonado: credit?.monto_abonado ?? null,
      creditEstado: credit?.estado_credito ?? null,
      creditCancelledBy: credit?.anulado_por ?? null,
      creditCancelledAt: credit?.anulado_en ?? null,
      creditCancellationReason: credit?.motivo_anulacion ?? null,
    };
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
  createCreditPayment: vi.fn(async (_env: ApiEnv, input) => {
    const credit = mocks.credits.find((item) => item.id_credito === input.idCredito);
    if (!credit) return;

    credit.monto_abonado += input.valorAbono;
    credit.saldo_pendiente -= input.valorAbono;
    credit.estado_credito = input.estadoCredito;
    credit.actualizado_por = input.idUsuario;

    mocks.payments.push({
      id_abono: input.idAbono,
      id_credito: input.idCredito,
      id_cliente: input.idCliente,
      id_usuario: input.idUsuario,
      valor_abono: input.valorAbono,
      metodo_pago: input.metodoPago,
      referencia_pago: input.referenciaPago,
      fecha_abono: '2026-07-02',
      observaciones: input.observaciones,
      creado_en: '2026-07-02',
      estado_abono: 'ACTIVO',
      anulado_en: null,
      motivo_anulacion: null,
      usuario_nombre: 'Usuario',
    });
  }),
  getCreditPaymentPersistenceStatus: vi.fn(
    async (_env: ApiEnv, idCredito: string, idAbono: string) => {
      const credit = mocks.credits.find((item) => item.id_credito === idCredito);
      const payment = mocks.payments.find((item) => item.id_abono === idAbono);

      return {
        creditSaldoPendiente: credit?.saldo_pendiente ?? null,
        creditMontoAbonado: credit?.monto_abonado ?? null,
        creditEstado: credit?.estado_credito ?? null,
        paymentExists: Boolean(payment),
      };
    },
  ),
  findCreditPaymentById: vi.fn(async (_env: ApiEnv, idAbono: string) => {
    const payment = mocks.payments.find((item) => item.id_abono === idAbono);
    return payment ? { ...payment } : null;
  }),
  cancelCreditPayment: vi.fn(async (_env: ApiEnv, input) => {
    const credit = mocks.credits.find((item) => item.id_credito === input.idCredito);
    const payment = mocks.payments.find(
      (item) =>
        item.id_abono === input.idAbono &&
        item.id_credito === input.idCredito &&
        item.estado_abono === 'ACTIVO',
    );

    if (!credit || !payment) return;
    if (
      credit.estado_credito === 'ANULADO' ||
      credit.monto_abonado !== input.montoAbonadoAntes ||
      credit.saldo_pendiente !== input.saldoAntes ||
      credit.monto_abonado < input.valorAbono
    ) {
      return;
    }

    credit.monto_abonado = input.montoAbonadoDespues;
    credit.saldo_pendiente = input.saldoDespues;
    credit.estado_credito = input.estadoCredito;
    credit.actualizado_por = input.idUsuario;

    payment.estado_abono = 'ANULADO';
    payment.anulado_en = '2026-07-03 10:00:00';
    payment.motivo_anulacion = input.motivoAnulacion;
  }),
  getCreditPaymentCancellationPersistenceStatus: vi.fn(
    async (_env: ApiEnv, idCredito: string, idAbono: string) => {
      const credit = mocks.credits.find((item) => item.id_credito === idCredito);
      const payment = mocks.payments.find((item) => item.id_abono === idAbono);

      return {
        creditSaldoPendiente: credit?.saldo_pendiente ?? null,
        creditMontoAbonado: credit?.monto_abonado ?? null,
        creditEstado: credit?.estado_credito ?? null,
        paymentCancelled: payment?.estado_abono === 'ANULADO',
        paymentCancelledBy: payment?.estado_abono === 'ANULADO' ? 'usr_admin' : null,
        paymentCancelledAt: payment?.anulado_en ?? null,
        paymentCancellationReason: payment?.motivo_anulacion ?? null,
      };
    },
  ),
  createCreditAdjustment: vi.fn(async (_env: ApiEnv, input) => {
    const credit = mocks.credits.find((item) => item.id_credito === input.idCredito);
    if (!credit) return;

    credit.saldo_pendiente = input.saldoDespues;
    credit.estado_credito = input.estadoCredito;
    credit.actualizado_por = input.idUsuario;

    mocks.adjustments.push({
      id_ajuste: input.idAjuste,
      id_credito: input.idCredito,
      id_usuario: input.idUsuario,
      tipo_ajuste: input.tipoAjuste,
      valor_ajuste: input.valorAjuste,
      saldo_antes: input.saldoAntes,
      saldo_despues: input.saldoDespues,
      motivo: input.motivo,
      creado_en: '2026-07-02',
      usuario_nombre: 'Usuario',
    });
  }),
  getCreditAdjustmentPersistenceStatus: vi.fn(
    async (_env: ApiEnv, idCredito: string, idAjuste: string) => {
      const credit = mocks.credits.find((item) => item.id_credito === idCredito);
      const adjustment = mocks.adjustments.find((item) => item.id_ajuste === idAjuste);

      return {
        creditSaldoPendiente: credit?.saldo_pendiente ?? null,
        creditMontoAbonado: credit?.monto_abonado ?? null,
        creditEstado: credit?.estado_credito ?? null,
        adjustmentExists: Boolean(adjustment),
      };
    },
  ),
}));

const {
  cancelCredit,
  cancelCreditPayment,
  createCreditAdjustment,
  createCreditPayment,
  createOldDebt,
  getCreditById,
  listClientCredits,
  listCredits,
} = await import('./credits.service');

const env = {} as ApiEnv;
const adminAuth = { user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' } } as AuthContext;
const sellerAuth = { user: { id_usuario: 'usr_vendedor', rol: 'VENDEDOR' } } as AuthContext;

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
    mocks.salePayments = [];
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

  it('ADMINISTRADOR anula credito DEUDA_ANTIGUA sin abonos ni ajustes', async () => {
    const result = await cancelCredit(env, adminAuth, 'cre_1', {
      motivoAnulacion: 'Credito registrado por error',
    });

    expect(result).toEqual({
      id_credito: 'cre_1',
      estado_credito: 'ANULADO',
      saldo_anterior: 150000,
      saldo_nuevo: 0,
      monto_inicial: 150000,
      monto_abonado: 0,
    });
    expect(mocks.credits[0]).toMatchObject({
      estado_credito: 'ANULADO',
      saldo_pendiente: 0,
      monto_inicial: 150000,
      monto_abonado: 0,
      anulado_por: 'usr_admin',
      anulado_en: '2026-07-03 11:00:00',
      motivo_anulacion: 'Credito registrado por error',
      actualizado_por: 'usr_admin',
    });
    expect(mocks.payments).toHaveLength(0);
    expect(mocks.adjustments).toHaveLength(0);
    expect(mocks.sales).toHaveLength(0);
    expect(mocks.salePayments).toHaveLength(0);
    expect(mocks.inventoryMovements).toHaveLength(0);
  });

  it('GET credito y listado de cliente reflejan credito ANULADO', async () => {
    await cancelCredit(env, adminAuth, 'cre_1', {
      motivoAnulacion: 'Credito registrado por error',
    });

    const detail = await getCreditById(env, 'cre_1');
    const list = await listClientCredits(env, 'cli_1', { limit: 50, offset: 0 });

    expect(detail).toMatchObject({
      estadoCredito: 'ANULADO',
      saldoPendiente: 0,
      motivoAnulacion: 'Credito registrado por error',
      resumen: {
        saldoPendiente: 0,
        estadoCredito: 'ANULADO',
      },
    });
    expect(list[0]).toMatchObject({
      estadoCredito: 'ANULADO',
      saldoPendiente: 0,
      motivoAnulacion: 'Credito registrado por error',
    });
  });

  it('rechaza anulacion directa de credito inexistente, anulado o no permitido', async () => {
    await expect(
      cancelCredit(env, adminAuth, 'missing', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_NOT_FOUND' });

    mocks.credits[0] = buildCredit({ estado_credito: 'ANULADO' });
    await expect(
      cancelCredit(env, adminAuth, 'cre_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_CANCELLED' });

    mocks.credits[0] = buildCredit({ origen_credito: 'VENTA' });
    await expect(
      cancelCredit(env, adminAuth, 'cre_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDITO_DE_VENTA_NO_ANULABLE_DIRECTAMENTE' });

    mocks.credits[0] = buildCredit({ id_venta: 'ven_1' });
    await expect(
      cancelCredit(env, adminAuth, 'cre_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDITO_DE_VENTA_NO_ANULABLE_DIRECTAMENTE' });
  });

  it('rechaza anulacion directa con cualquier abono o ajuste asociado', async () => {
    mocks.payments = [buildPayment({ estado_abono: 'ANULADO' })];

    await expect(
      cancelCredit(env, adminAuth, 'cre_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDITO_CON_ABONOS_NO_ANULABLE' });

    expect(mocks.credits[0]?.estado_credito).toBe('PENDIENTE');

    mocks.payments = [];
    mocks.adjustments = [buildAdjustment()];

    await expect(
      cancelCredit(env, adminAuth, 'cre_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDITO_CON_AJUSTES_NO_ANULABLE' });

    expect(mocks.credits[0]).toMatchObject({
      estado_credito: 'PENDIENTE',
      saldo_pendiente: 150000,
      anulado_por: null,
      anulado_en: null,
    });
  });

  it('ADMINISTRADOR registra abono parcial y actualiza cartera sin tocar ventas ni inventario', async () => {
    const result = await createCreditPayment(env, adminAuth, 'cre_1', {
      valorAbono: 50000,
      metodoPago: 'EFECTIVO',
      referenciaPago: null,
      observaciones: 'Abono en caja',
    });

    expect(result).toMatchObject({
      id_credito: 'cre_1',
      valor_abono: 50000,
      saldo_anterior: 150000,
      saldo_nuevo: 100000,
      estado_credito: 'PARCIAL',
    });
    expect(mocks.credits[0]).toMatchObject({
      monto_abonado: 50000,
      saldo_pendiente: 100000,
      estado_credito: 'PARCIAL',
      actualizado_por: 'usr_admin',
    });
    expect(mocks.payments[0]).toMatchObject({
      id_credito: 'cre_1',
      id_usuario: 'usr_admin',
      valor_abono: 50000,
      metodo_pago: 'EFECTIVO',
      estado_abono: 'ACTIVO',
    });
    expect(mocks.sales).toHaveLength(0);
    expect(mocks.inventoryMovements).toHaveLength(0);
  });

  it('VENDEDOR registra abono total y marca credito como pagado', async () => {
    const result = await createCreditPayment(env, sellerAuth, 'cre_1', {
      valorAbono: 150000,
      metodoPago: 'NEQUI',
      referenciaPago: 'REF-1',
      observaciones: null,
    });

    expect(result).toMatchObject({
      saldo_nuevo: 0,
      estado_credito: 'PAGADO',
    });
    expect(mocks.credits[0]).toMatchObject({
      monto_abonado: 150000,
      saldo_pendiente: 0,
      estado_credito: 'PAGADO',
      actualizado_por: 'usr_vendedor',
    });
  });

  it('rechaza abono a credito inexistente, anulado o pagado', async () => {
    await expect(
      createCreditPayment(env, adminAuth, 'missing', {
        valorAbono: 1000,
        metodoPago: 'EFECTIVO',
        referenciaPago: null,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_NOT_FOUND' });

    mocks.credits[0] = buildCredit({ estado_credito: 'ANULADO' });
    await expect(
      createCreditPayment(env, adminAuth, 'cre_1', {
        valorAbono: 1000,
        metodoPago: 'EFECTIVO',
        referenciaPago: null,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_CANCELLED' });

    mocks.credits[0] = buildCredit({ estado_credito: 'PAGADO', saldo_pendiente: 0 });
    await expect(
      createCreditPayment(env, adminAuth, 'cre_1', {
        valorAbono: 1000,
        metodoPago: 'EFECTIVO',
        referenciaPago: null,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_ALREADY_PAID' });
  });

  it('rechaza abono mayor al saldo pendiente', async () => {
    await expect(
      createCreditPayment(env, adminAuth, 'cre_1', {
        valorAbono: 150001,
        metodoPago: 'EFECTIVO',
        referenciaPago: null,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_PAYMENT_EXCEEDS_BALANCE' });
  });

  it('consulta credito y listado despues de registrar abono', async () => {
    await createCreditPayment(env, adminAuth, 'cre_1', {
      valorAbono: 50000,
      metodoPago: 'TRANSFERENCIA',
      referenciaPago: null,
      observaciones: null,
    });

    const detail = await getCreditById(env, 'cre_1');
    const list = await listClientCredits(env, 'cli_1', { limit: 50, offset: 0 });

    expect(detail.resumen).toMatchObject({
      montoAbonado: 50000,
      saldoPendiente: 100000,
      estadoCredito: 'PARCIAL',
    });
    expect(detail.abonos).toHaveLength(1);
    expect(list[0]).toMatchObject({
      montoAbonado: 50000,
      saldoPendiente: 100000,
      estadoCredito: 'PARCIAL',
    });
  });

  it('ADMINISTRADOR anula abono activo y recalcula credito a PENDIENTE', async () => {
    mocks.credits[0] = buildCredit({
      monto_abonado: 50000,
      saldo_pendiente: 100000,
      estado_credito: 'PARCIAL',
    });
    mocks.payments = [buildPayment()];

    const result = await cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', {
      motivoAnulacion: 'Abono registrado por error',
    });

    expect(result).toMatchObject({
      id_credito: 'cre_1',
      id_abono: 'abo_1',
      estado_abono: 'ANULADO',
      valor_abono_anulado: 50000,
      saldo_anterior: 100000,
      saldo_nuevo: 150000,
      monto_abonado_anterior: 50000,
      monto_abonado_nuevo: 0,
      estado_credito: 'PENDIENTE',
    });
    expect(mocks.credits[0]).toMatchObject({
      monto_abonado: 0,
      saldo_pendiente: 150000,
      estado_credito: 'PENDIENTE',
      actualizado_por: 'usr_admin',
    });
    expect(mocks.payments[0]).toMatchObject({
      estado_abono: 'ANULADO',
      motivo_anulacion: 'Abono registrado por error',
    });
    expect(mocks.adjustments).toHaveLength(0);
    expect(mocks.sales).toHaveLength(0);
    expect(mocks.inventoryMovements).toHaveLength(0);
  });

  it('anular abono recalcula credito a PARCIAL y puede reabrir credito PAGADO', async () => {
    mocks.credits[0] = buildCredit({
      monto_abonado: 100000,
      saldo_pendiente: 50000,
      estado_credito: 'PARCIAL',
    });
    mocks.payments = [buildPayment()];

    expect(
      await cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', {
        motivoAnulacion: 'Abono duplicado',
      }),
    ).toMatchObject({
      monto_abonado_nuevo: 50000,
      saldo_nuevo: 100000,
      estado_credito: 'PARCIAL',
    });

    mocks.credits[0] = buildCredit({
      monto_abonado: 150000,
      saldo_pendiente: 0,
      estado_credito: 'PAGADO',
    });
    mocks.payments = [buildPayment({ id_abono: 'abo_2', valor_abono: 150000 })];

    expect(
      await cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_2', {
        motivoAnulacion: 'Pago total equivocado',
      }),
    ).toMatchObject({
      monto_abonado_nuevo: 0,
      saldo_nuevo: 150000,
      estado_credito: 'PENDIENTE',
    });
  });

  it('GET credito refleja abono anulado y saldo actualizado', async () => {
    mocks.credits[0] = buildCredit({
      monto_abonado: 50000,
      saldo_pendiente: 100000,
      estado_credito: 'PARCIAL',
    });
    mocks.payments = [buildPayment()];

    await cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', {
      motivoAnulacion: 'Abono registrado por error',
    });

    const detail = await getCreditById(env, 'cre_1');
    const list = await listClientCredits(env, 'cli_1', { limit: 50, offset: 0 });

    expect(detail.resumen).toMatchObject({
      montoAbonado: 0,
      saldoPendiente: 150000,
      estadoCredito: 'PENDIENTE',
    });
    expect(detail.abonos[0]).toMatchObject({
      estado_abono: 'ANULADO',
      motivo_anulacion: 'Abono registrado por error',
    });
    expect(list[0]).toMatchObject({
      montoAbonado: 0,
      saldoPendiente: 150000,
      estadoCredito: 'PENDIENTE',
    });
  });

  it('rechaza anulacion de abono con credito o abono invalido', async () => {
    await expect(
      cancelCreditPayment(env, adminAuth, 'missing', 'abo_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_NOT_FOUND' });

    mocks.credits[0] = buildCredit({ estado_credito: 'ANULADO' });
    await expect(
      cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_CANCELLED' });

    mocks.credits[0] = buildCredit();
    await expect(
      cancelCreditPayment(env, adminAuth, 'cre_1', 'missing', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_PAYMENT_NOT_FOUND' });

    mocks.payments = [buildPayment({ id_credito: 'cre_2' })];
    await expect(
      cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_PAYMENT_DOES_NOT_BELONG_TO_CREDIT' });

    mocks.payments = [buildPayment({ estado_abono: 'ANULADO' })];
    await expect(
      cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_PAYMENT_ALREADY_CANCELLED' });
  });

  it('rechaza anulacion si monto_abonado actual es menor que el valor del abono', async () => {
    mocks.credits[0] = buildCredit({
      monto_abonado: 20000,
      saldo_pendiente: 130000,
      estado_credito: 'PARCIAL',
    });
    mocks.payments = [buildPayment({ valor_abono: 50000 })];

    await expect(
      cancelCreditPayment(env, adminAuth, 'cre_1', 'abo_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'CREDIT_PAYMENT_CANCELLATION_INVALID_BALANCE' });
    expect(mocks.payments[0]?.estado_abono).toBe('ACTIVO');
  });

  it('ADMINISTRADOR registra ajuste AUMENTO sin modificar monto abonado ni mover inventario', async () => {
    const result = await createCreditAdjustment(env, adminAuth, 'cre_1', {
      tipoAjuste: 'AUMENTO',
      valorAjuste: 20000,
      motivo: 'Correccion por saldo faltante',
    });

    expect(result).toMatchObject({
      id_credito: 'cre_1',
      tipo_ajuste: 'AUMENTO',
      valor_ajuste: 20000,
      saldo_antes: 150000,
      saldo_despues: 170000,
      estado_credito: 'PENDIENTE',
    });
    expect(mocks.credits[0]).toMatchObject({
      monto_abonado: 0,
      saldo_pendiente: 170000,
      estado_credito: 'PENDIENTE',
      actualizado_por: 'usr_admin',
    });
    expect(mocks.adjustments[0]).toMatchObject({
      id_credito: 'cre_1',
      id_usuario: 'usr_admin',
      saldo_antes: 150000,
      saldo_despues: 170000,
    });
    expect(mocks.payments).toHaveLength(0);
    expect(mocks.sales).toHaveLength(0);
    expect(mocks.inventoryMovements).toHaveLength(0);
  });

  it('ADMINISTRADOR registra ajuste DESCUENTO y puede dejar credito pagado', async () => {
    const result = await createCreditAdjustment(env, adminAuth, 'cre_1', {
      tipoAjuste: 'DESCUENTO',
      valorAjuste: 150000,
      motivo: 'Descuento autorizado',
    });

    expect(result).toMatchObject({
      tipo_ajuste: 'DESCUENTO',
      valor_ajuste: 150000,
      saldo_antes: 150000,
      saldo_despues: 0,
      estado_credito: 'PAGADO',
    });
    expect(mocks.credits[0]).toMatchObject({
      monto_abonado: 0,
      saldo_pendiente: 0,
      estado_credito: 'PAGADO',
    });
  });

  it('ADMINISTRADOR registra ajuste CORRECCION y guarda diferencia absoluta', async () => {
    const result = await createCreditAdjustment(env, adminAuth, 'cre_1', {
      tipoAjuste: 'CORRECCION',
      saldoFinal: 50000,
      motivo: 'Correccion manual de cartera',
    });

    expect(result).toMatchObject({
      tipo_ajuste: 'CORRECCION',
      valor_ajuste: 100000,
      saldo_antes: 150000,
      saldo_despues: 50000,
      estado_credito: 'PENDIENTE',
    });
    expect(mocks.adjustments[0]).toMatchObject({
      valor_ajuste: 100000,
      saldo_antes: 150000,
      saldo_despues: 50000,
    });
  });

  it('ajuste con saldo mayor a 0 marca PARCIAL cuando ya hay monto abonado', async () => {
    mocks.credits[0] = buildCredit({
      monto_abonado: 50000,
      saldo_pendiente: 100000,
      estado_credito: 'PARCIAL',
    });

    const result = await createCreditAdjustment(env, adminAuth, 'cre_1', {
      tipoAjuste: 'AUMENTO',
      valorAjuste: 10000,
      motivo: 'Ajuste de saldo',
    });

    expect(result).toMatchObject({
      saldo_despues: 110000,
      estado_credito: 'PARCIAL',
    });
    expect(mocks.credits[0].monto_abonado).toBe(50000);
  });

  it('AUMENTO puede reabrir credito pagado', async () => {
    mocks.credits[0] = buildCredit({
      estado_credito: 'PAGADO',
      monto_abonado: 150000,
      saldo_pendiente: 0,
    });

    const result = await createCreditAdjustment(env, adminAuth, 'cre_1', {
      tipoAjuste: 'AUMENTO',
      valorAjuste: 20000,
      motivo: 'Reapertura por correccion',
    });

    expect(result).toMatchObject({
      saldo_antes: 0,
      saldo_despues: 20000,
      estado_credito: 'PARCIAL',
    });
  });

  it('rechaza ajuste a credito inexistente o anulado', async () => {
    await expect(
      createCreditAdjustment(env, adminAuth, 'missing', {
        tipoAjuste: 'AUMENTO',
        valorAjuste: 1000,
        motivo: 'x',
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_NOT_FOUND' });

    mocks.credits[0] = buildCredit({ estado_credito: 'ANULADO' });

    await expect(
      createCreditAdjustment(env, adminAuth, 'cre_1', {
        tipoAjuste: 'AUMENTO',
        valorAjuste: 1000,
        motivo: 'x',
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_CANCELLED' });
  });

  it('rechaza DESCUENTO mayor al saldo pendiente', async () => {
    await expect(
      createCreditAdjustment(env, adminAuth, 'cre_1', {
        tipoAjuste: 'DESCUENTO',
        valorAjuste: 150001,
        motivo: 'x',
      }),
    ).rejects.toMatchObject({ code: 'CREDIT_ADJUSTMENT_EXCEEDS_BALANCE' });
  });

  it('GET credito y listados reflejan ajuste aplicado', async () => {
    await createCreditAdjustment(env, adminAuth, 'cre_1', {
      tipoAjuste: 'DESCUENTO',
      valorAjuste: 50000,
      motivo: 'Descuento autorizado',
    });

    const detail = await getCreditById(env, 'cre_1');
    const clientCredits = await listClientCredits(env, 'cli_1', { limit: 50, offset: 0 });
    const allCredits = await listCredits(env, { limit: 50, offset: 0 });

    expect(detail.resumen).toMatchObject({
      montoAbonado: 0,
      saldoPendiente: 100000,
      estadoCredito: 'PENDIENTE',
    });
    expect(detail.ajustes).toHaveLength(1);
    expect(clientCredits[0]).toMatchObject({ saldoPendiente: 100000 });
    expect(allCredits[0]).toMatchObject({ saldoPendiente: 100000 });
  });
});
