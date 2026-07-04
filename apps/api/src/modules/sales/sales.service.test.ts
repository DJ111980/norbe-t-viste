import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  ListSalesFilters,
  SaleClientRecord,
  SaleDetailRecord,
  SaleListRecord,
  SalePaymentRecord,
  SaleVariantRecord,
} from './sales.types';

const mocks = vi.hoisted(() => ({
  clients: [] as SaleClientRecord[],
  variants: [] as SaleVariantRecord[],
  sales: [] as SaleListRecord[],
  payments: [] as SalePaymentRecord[],
  details: [] as SaleDetailRecord[],
  movements: [] as Array<{
    tipo_movimiento: string;
    stock_antes: number;
    stock_despues: number;
    referencia_tipo: string;
    referencia_id: string;
  }>,
  credits: [] as Array<{
    id_credito: string;
    id_cliente: string;
    id_venta: string;
    origen_credito: string;
    monto_inicial: number;
    monto_abonado: number;
    saldo_pendiente: number;
    estado_credito: string;
  }>,
  creditDetails: [] as Array<{
    id_credito: string;
    id_variante: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>,
  installments: [] as unknown[],
  adjustments: [] as unknown[],
  labels: [] as unknown[],
  images: [] as unknown[],
  failPersistence: false,
  lastListFilters: undefined as ListSalesFilters | undefined,
}));

vi.mock('./sales.repository', () => ({
  findClientForSale: vi.fn(async (_env: ApiEnv, idCliente: string) => {
    return mocks.clients.find((client) => client.id_cliente === idCliente) ?? null;
  }),
  findVariantForSale: vi.fn(async (_env: ApiEnv, idVariante: string) => {
    return mocks.variants.find((variant) => variant.id_variante === idVariante) ?? null;
  }),
  findVariantStockById: vi.fn(async (_env: ApiEnv, idVariante: string) => {
    const variant = mocks.variants.find((item) => item.id_variante === idVariante);
    return variant
      ? {
          id_variante: variant.id_variante,
          stock_actual: variant.stock_actual,
        }
      : null;
  }),
  createCashSale: vi.fn(async (_env: ApiEnv, input) => {
    mocks.sales.push(
      buildSale({
        id_venta: input.idVenta,
        numero_venta: input.numeroVenta,
        id_cliente: input.idCliente,
        id_usuario: input.idUsuario,
        total: input.total,
        subtotal: input.subtotal,
        descuento: input.descuento,
        valor_pagado_inicial: input.total,
        fecha_venta: input.fechaVenta,
        cantidad_items: input.detalles.reduce(
          (sum: number, detail: { cantidad: number }) => sum + detail.cantidad,
          0,
        ),
      }),
    );
    mocks.payments.push(
      buildPayment({
        id_pago_venta: input.idPagoVenta,
        id_venta: input.idVenta,
        metodo_pago: input.metodoPago,
        valor_pagado: input.total,
      }),
    );

    for (const detail of input.detalles) {
      const variant = mocks.variants.find((item) => item.id_variante === detail.idVariante);
      if (!variant || variant.stock_actual < detail.cantidad) continue;

      variant.stock_actual -= detail.cantidad;
      mocks.details.push(
        buildDetail({
          id_detalle_venta: detail.idDetalleVenta,
          id_venta: input.idVenta,
          id_variante: detail.idVariante,
          nombre_producto: detail.nombreProducto,
          sku: detail.sku,
          talla: detail.talla,
          color: detail.color,
          codigo_qr: detail.codigoQr,
          cantidad: detail.cantidad,
          precio_unitario: detail.precioUnitario,
          descuento: detail.descuento,
          subtotal: detail.subtotal,
        }),
      );
      mocks.movements.push({
        tipo_movimiento: 'VENTA',
        stock_antes: detail.stockAntes,
        stock_despues: detail.stockDespues,
        referencia_tipo: 'VENTA',
        referencia_id: input.idVenta,
      });
    }
  }),
  getCashSalePersistenceStatus: vi.fn(async (_env: ApiEnv, idVenta: string) => ({
    saleExists: mocks.sales.some((sale) => sale.id_venta === idVenta),
    paymentExists:
      !mocks.failPersistence && mocks.payments.some((payment) => payment.id_venta === idVenta),
    movementCount: mocks.movements.filter((movement) => movement.referencia_id === idVenta).length,
    detailsCount: mocks.details.filter((detail) => detail.id_venta === idVenta).length,
  })),
  createCreditSale: vi.fn(async (_env: ApiEnv, input) => {
    mocks.sales.push(
      buildSale({
        id_venta: input.idVenta,
        numero_venta: input.numeroVenta,
        id_cliente: input.idCliente,
        id_usuario: input.idUsuario,
        tipo_venta: 'CREDITO',
        total: input.total,
        subtotal: input.subtotal,
        descuento: input.descuento,
        valor_pagado_inicial: 0,
        saldo_pendiente: input.total,
        fecha_venta: input.fechaVenta,
        cantidad_items: input.detalles.reduce(
          (sum: number, detail: { cantidad: number }) => sum + detail.cantidad,
          0,
        ),
      }),
    );
    mocks.credits.push({
      id_credito: input.idCredito,
      id_cliente: input.idCliente,
      id_venta: input.idVenta,
      origen_credito: 'VENTA',
      monto_inicial: input.total,
      monto_abonado: 0,
      saldo_pendiente: input.total,
      estado_credito: 'PENDIENTE',
    });

    for (const detail of input.detalles) {
      const variant = mocks.variants.find((item) => item.id_variante === detail.idVariante);
      if (!variant || variant.stock_actual < detail.cantidad) continue;

      variant.stock_actual -= detail.cantidad;
      mocks.details.push(
        buildDetail({
          id_detalle_venta: detail.idDetalleVenta,
          id_venta: input.idVenta,
          id_variante: detail.idVariante,
          nombre_producto: detail.nombreProducto,
          sku: detail.sku,
          talla: detail.talla,
          color: detail.color,
          codigo_qr: detail.codigoQr,
          cantidad: detail.cantidad,
          precio_unitario: detail.precioUnitario,
          descuento: detail.descuento,
          subtotal: detail.subtotal,
        }),
      );
      mocks.creditDetails.push({
        id_credito: input.idCredito,
        id_variante: detail.idVariante,
        cantidad: detail.cantidad,
        precio_unitario: detail.precioUnitario,
        subtotal: detail.subtotal,
      });
      mocks.movements.push({
        tipo_movimiento: 'VENTA',
        stock_antes: detail.stockAntes,
        stock_despues: detail.stockDespues,
        referencia_tipo: 'VENTA',
        referencia_id: input.idVenta,
      });
    }
  }),
  getCreditSalePersistenceStatus: vi.fn(
    async (
      _env: ApiEnv,
      idVenta: string,
      idCredito: string,
      expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
    ) => ({
      saleExists: mocks.sales.some((sale) => sale.id_venta === idVenta),
      creditExists: mocks.credits.some(
        (credit) => credit.id_credito === idCredito && credit.id_venta === idVenta,
      ),
      paymentExists: mocks.payments.some((payment) => payment.id_venta === idVenta),
      creditPaymentExists: mocks.installments.length > 0,
      creditAdjustmentExists: mocks.adjustments.length > 0,
      movementCount: mocks.movements.filter((movement) => movement.referencia_id === idVenta)
        .length,
      detailsCount: mocks.details.filter((detail) => detail.id_venta === idVenta).length,
      creditDetailsCount: mocks.creditDetails.filter((detail) => detail.id_credito === idCredito)
        .length,
      stockMatchesCount: expectedStocks.filter(
        (stock) =>
          mocks.variants.find((variant) => variant.id_variante === stock.idVariante)
            ?.stock_actual === stock.stockDespues,
      ).length,
    }),
  ),
  createMixedSale: vi.fn(async (_env: ApiEnv, input) => {
    mocks.sales.push(
      buildSale({
        id_venta: input.idVenta,
        numero_venta: input.numeroVenta,
        id_cliente: input.idCliente,
        id_usuario: input.idUsuario,
        tipo_venta: 'MIXTA',
        total: input.total,
        subtotal: input.subtotal,
        descuento: input.descuento,
        valor_pagado_inicial: input.valorPagadoInicial,
        saldo_pendiente: input.saldoCredito,
        fecha_venta: input.fechaVenta,
        cantidad_items: input.detalles.reduce(
          (sum: number, detail: { cantidad: number }) => sum + detail.cantidad,
          0,
        ),
      }),
    );
    mocks.payments.push(
      buildPayment({
        id_pago_venta: input.idPagoVenta,
        id_venta: input.idVenta,
        metodo_pago: input.metodoPago,
        valor_pagado: input.valorPagadoInicial,
      }),
    );
    mocks.credits.push({
      id_credito: input.idCredito,
      id_cliente: input.idCliente,
      id_venta: input.idVenta,
      origen_credito: 'VENTA',
      monto_inicial: input.saldoCredito,
      monto_abonado: 0,
      saldo_pendiente: input.saldoCredito,
      estado_credito: 'PENDIENTE',
    });

    for (const detail of input.detalles) {
      const variant = mocks.variants.find((item) => item.id_variante === detail.idVariante);
      if (!variant || variant.stock_actual < detail.cantidad) continue;

      variant.stock_actual -= detail.cantidad;
      mocks.details.push(
        buildDetail({
          id_detalle_venta: detail.idDetalleVenta,
          id_venta: input.idVenta,
          id_variante: detail.idVariante,
          nombre_producto: detail.nombreProducto,
          sku: detail.sku,
          talla: detail.talla,
          color: detail.color,
          codigo_qr: detail.codigoQr,
          cantidad: detail.cantidad,
          precio_unitario: detail.precioUnitario,
          descuento: detail.descuento,
          subtotal: detail.subtotal,
        }),
      );
      mocks.creditDetails.push({
        id_credito: input.idCredito,
        id_variante: detail.idVariante,
        cantidad: detail.cantidad,
        precio_unitario: detail.precioUnitario,
        subtotal: detail.subtotal,
      });
      mocks.movements.push({
        tipo_movimiento: 'VENTA',
        stock_antes: detail.stockAntes,
        stock_despues: detail.stockDespues,
        referencia_tipo: 'VENTA',
        referencia_id: input.idVenta,
      });
    }
  }),
  getMixedSalePersistenceStatus: vi.fn(
    async (
      _env: ApiEnv,
      idVenta: string,
      idCredito: string,
      expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
    ) => {
      const credit = mocks.credits.find((item) => item.id_credito === idCredito);

      return {
        saleExists: mocks.sales.some((sale) => sale.id_venta === idVenta),
        paymentCount: mocks.payments.filter((payment) => payment.id_venta === idVenta).length,
        creditExists: Boolean(credit?.id_venta === idVenta),
        creditInitialAmount: credit?.monto_inicial ?? null,
        creditPaidAmount: credit?.monto_abonado ?? null,
        creditBalance: credit?.saldo_pendiente ?? null,
        creditStatus: credit?.estado_credito ?? null,
        creditPaymentExists: mocks.installments.length > 0,
        creditAdjustmentExists: mocks.adjustments.length > 0,
        movementCount: mocks.movements.filter((movement) => movement.referencia_id === idVenta)
          .length,
        detailsCount: mocks.details.filter((detail) => detail.id_venta === idVenta).length,
        creditDetailsCount: mocks.creditDetails.filter((detail) => detail.id_credito === idCredito)
          .length,
        stockMatchesCount: expectedStocks.filter(
          (stock) =>
            mocks.variants.find((variant) => variant.id_variante === stock.idVariante)
              ?.stock_actual === stock.stockDespues,
        ).length,
      };
    },
  ),
  listSales: vi.fn(async (_env: ApiEnv, filters: ListSalesFilters) => {
    mocks.lastListFilters = filters;
    return mocks.sales.filter((sale) => {
      if (filters.estado && sale.estado_venta !== filters.estado) return false;
      if (filters.tipoVenta && sale.tipo_venta !== filters.tipoVenta) return false;
      if (filters.cliente && sale.id_cliente !== filters.cliente) return false;
      if (filters.vendedor && sale.id_usuario !== filters.vendedor) return false;
      return true;
    });
  }),
  findSaleById: vi.fn(async (_env: ApiEnv, idVenta: string) => {
    return mocks.sales.find((sale) => sale.id_venta === idVenta) ?? null;
  }),
  listSaleDetails: vi.fn(async (_env: ApiEnv, idVenta: string) => {
    return mocks.details.filter((detail) => detail.id_venta === idVenta);
  }),
  listSalePayments: vi.fn(async (_env: ApiEnv, idVenta: string) => {
    return mocks.payments.filter((payment) => payment.id_venta === idVenta);
  }),
  getSaleDetailView: vi.fn(async (_env: ApiEnv, idVenta: string) => {
    const sale = mocks.sales.find((item) => item.id_venta === idVenta);
    if (!sale) return null;

    return {
      ...sale,
      detalles: mocks.details.filter((detail) => detail.id_venta === idVenta),
      pagos: mocks.payments.filter((payment) => payment.id_venta === idVenta),
    };
  }),
  listSaleCredits: vi.fn(async (_env: ApiEnv, idVenta: string) => {
    return mocks.credits.filter((credit) => credit.id_venta === idVenta);
  }),
  creditHasPayments: vi.fn(async () => {
    return mocks.installments.length > 0;
  }),
  creditHasAdjustments: vi.fn(async () => {
    return mocks.adjustments.length > 0;
  }),
  cancelSale: vi.fn(async (_env: ApiEnv, input) => {
    const sale = mocks.sales.find((item) => item.id_venta === input.idVenta);
    if (sale?.estado_venta === 'COMPLETADA' && sale.tipo_venta === input.tipoVenta) {
      sale.estado_venta = 'ANULADA';
      sale.anulado_en = '2026-07-02 11:00:00';
      sale.motivo_anulacion = input.motivoAnulacion;
    }

    for (const payment of mocks.payments.filter(
      (item) =>
        item.id_venta === input.idVenta &&
        item.estado_pago === 'ACTIVO' &&
        (input.tipoVenta === 'CONTADO' || input.tipoVenta === 'MIXTA'),
    )) {
      payment.estado_pago = 'ANULADO';
      payment.anulado_en = '2026-07-02 11:00:00';
      payment.motivo_anulacion = input.motivoAnulacion;
    }

    const credit = mocks.credits.find((item) => item.id_credito === input.idCredito);
    if (
      credit &&
      input.idCredito &&
      credit.estado_credito === 'PENDIENTE' &&
      credit.monto_abonado === 0 &&
      credit.saldo_pendiente === credit.monto_inicial &&
      mocks.installments.length === 0 &&
      mocks.adjustments.length === 0
    ) {
      credit.estado_credito = 'ANULADO';
      credit.saldo_pendiente = 0;
    }

    for (const movement of input.movimientos) {
      const variant = mocks.variants.find((item) => item.id_variante === movement.idVariante);
      if (!variant || variant.stock_actual !== movement.stockAntes) continue;

      variant.stock_actual = movement.stockDespues;
      mocks.movements.push({
        tipo_movimiento: 'ANULACION_VENTA',
        stock_antes: movement.stockAntes,
        stock_despues: movement.stockDespues,
        referencia_tipo: 'ANULACION_VENTA',
        referencia_id: input.idVenta,
      });
    }
  }),
  getCancellationPersistenceStatus: vi.fn(
    async (
      _env: ApiEnv,
      idVenta: string,
      tipoVenta: string,
      expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
      idCredito?: string,
    ) => {
      const credit = mocks.credits.find((item) => item.id_credito === idCredito);

      return {
        saleCancelled:
          mocks.sales.find((sale) => sale.id_venta === idVenta)?.estado_venta === 'ANULADA',
        activePaymentsCount: mocks.payments.filter(
          (payment) => payment.id_venta === idVenta && payment.estado_pago === 'ACTIVO',
        ).length,
        cancelledPaymentsCount: mocks.payments.filter(
          (payment) => payment.id_venta === idVenta && payment.estado_pago === 'ANULADO',
        ).length,
        creditCancelled: tipoVenta === 'CONTADO' || credit?.estado_credito === 'ANULADO',
        creditBalance: credit?.saldo_pendiente ?? null,
        creditPaymentExists: mocks.installments.length > 0,
        creditAdjustmentExists: mocks.adjustments.length > 0,
        cancellationMovementCount: mocks.movements.filter(
          (movement) =>
            movement.referencia_id === idVenta && movement.referencia_tipo === 'ANULACION_VENTA',
        ).length,
        stockMatchesCount: expectedStocks.filter(
          (stock) =>
            mocks.variants.find((variant) => variant.id_variante === stock.idVariante)
              ?.stock_actual === stock.stockDespues,
        ).length,
      };
    },
  ),
}));

const { cancelSale, createCashSale, createSale, getSaleById, listSalePayments, listSales } =
  await import('./sales.service');

const env = {} as ApiEnv;
const adminAuth = { user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' } } as AuthContext;
const sellerAuth = { user: { id_usuario: 'usr_seller', rol: 'VENDEDOR' } } as AuthContext;

function buildVariant(overrides: Partial<SaleVariantRecord> = {}): SaleVariantRecord {
  return {
    id_variante: 'var_1',
    id_producto: 'prd_1',
    sku: 'SKU-1',
    codigo_qr: 'NTV-VAR-000001',
    talla: 'M',
    color: 'Azul',
    precio_venta: 50000,
    stock_actual: 3,
    estado: 'ACTIVA',
    nombre_producto: 'Blusa',
    estado_producto: 'ACTIVO',
    ...overrides,
  };
}

function buildSale(overrides: Partial<SaleListRecord> = {}): SaleListRecord {
  return {
    id_venta: 'ven_1',
    numero_venta: 'VTA-20260702-ABC',
    id_cliente: 'cli_1',
    id_usuario: 'usr_admin',
    tipo_venta: 'CONTADO',
    subtotal: 50000,
    descuento: 0,
    total: 50000,
    valor_pagado_inicial: 50000,
    saldo_pendiente: 0,
    estado_venta: 'COMPLETADA',
    observaciones: 'Venta de contado',
    fecha_venta: '2026-07-02T10:00:00-05:00',
    creado_en: '2026-07-02 10:00:00',
    actualizado_en: '2026-07-02 10:00:00',
    anulado_por: null,
    anulado_en: null,
    motivo_anulacion: null,
    cliente_nombre: 'Cliente Uno',
    vendedor_nombre: 'Admin',
    vendedor_correo: 'admin@norbe.test',
    cantidad_items: 1,
    ...overrides,
  };
}

function buildDetail(overrides: Partial<SaleDetailRecord> = {}): SaleDetailRecord {
  return {
    id_detalle_venta: 'det_1',
    id_venta: 'ven_1',
    id_variante: 'var_1',
    codigo_qr: 'NTV-VAR-000001',
    nombre_producto: 'Blusa congelada',
    sku: 'SKU-CONGELADO',
    talla: 'M',
    color: 'Azul',
    cantidad: 1,
    precio_unitario: 50000,
    descuento: 0,
    subtotal: 50000,
    creado_en: '2026-07-02 10:00:00',
    ...overrides,
  };
}

function buildPayment(overrides: Partial<SalePaymentRecord> = {}): SalePaymentRecord {
  return {
    id_pago_venta: 'pag_1',
    id_venta: 'ven_1',
    metodo_pago: 'EFECTIVO',
    valor_pagado: 50000,
    referencia_pago: null,
    observaciones: 'Pago completo',
    creado_en: '2026-07-02 10:00:00',
    id_usuario: 'usr_admin',
    estado_pago: 'ACTIVO',
    anulado_en: null,
    motivo_anulacion: null,
    usuario_nombre: 'Admin',
    usuario_correo: 'admin@norbe.test',
    ...overrides,
  };
}

describe('sales service', () => {
  beforeEach(() => {
    mocks.clients = [{ id_cliente: 'cli_1', estado: 'ACTIVO' }];
    mocks.variants = [
      buildVariant(),
      buildVariant({ id_variante: 'var_inactiva', estado: 'INACTIVA' }),
      buildVariant({ id_variante: 'var_producto_inactivo', estado_producto: 'INACTIVO' }),
      buildVariant({ id_variante: 'var_sin_stock', stock_actual: 0 }),
    ];
    mocks.sales = [buildSale()];
    mocks.payments = [buildPayment()];
    mocks.details = [buildDetail()];
    mocks.movements = [];
    mocks.credits = [];
    mocks.creditDetails = [];
    mocks.installments = [];
    mocks.adjustments = [];
    mocks.labels = [];
    mocks.images = [];
    mocks.failPersistence = false;
    mocks.lastListFilters = undefined;
  });

  it('ADMINISTRADOR crea venta de contado, descuenta stock, pago y movimiento', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createCashSale(env, adminAuth, {
      tipoVenta: 'CONTADO',
      idCliente: null,
      metodoPago: 'EFECTIVO',
      observaciones: 'Venta de contado',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000 }],
    });

    expect(result).toMatchObject({
      tipo_venta: 'CONTADO',
      estado_venta: 'COMPLETADA',
      total: 50000,
      saldo_pendiente: 0,
      items_vendidos: 1,
      movimientos_creados: 1,
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(2);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'VENTA',
      stock_antes: 3,
      stock_despues: 2,
      referencia_tipo: 'VENTA',
    });
    expect(mocks.payments[0]).toMatchObject({
      metodo_pago: 'EFECTIVO',
      valor_pagado: 50000,
      estado_pago: 'ACTIVO',
    });
  });

  it('calcula venta de contado con descuentos de linea y general', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createCashSale(env, adminAuth, {
      tipoVenta: 'CONTADO',
      idCliente: null,
      metodoPago: 'EFECTIVO',
      descuentoGeneral: 5000,
      observaciones: 'Venta con descuento',
      detalles: [{ idVariante: 'var_1', cantidad: 2, descuento: 10000 }],
    });

    expect(result).toMatchObject({
      tipo_venta: 'CONTADO',
      total: 85000,
      saldo_pendiente: 0,
    });
    expect(mocks.sales[0]).toMatchObject({
      subtotal: 100000,
      descuento: 15000,
      total: 85000,
      valor_pagado_inicial: 85000,
    });
    expect(mocks.details[0]).toMatchObject({
      precio_unitario: 50000,
      descuento: 10000,
      subtotal: 90000,
    });
    expect(mocks.payments[0]).toMatchObject({ valor_pagado: 85000 });
  });

  it('rechaza precio manual distinto al precio de la variante', async () => {
    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 55000 }],
      }),
    ).rejects.toMatchObject({ code: 'SALE_PRICE_MISMATCH' });
  });

  it('rechaza descuentos mayores al subtotal disponible', async () => {
    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1, descuento: 50001 }],
      }),
    ).rejects.toMatchObject({ code: 'SALE_LINE_DISCOUNT_EXCEEDS_SUBTOTAL' });

    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        descuentoGeneral: 50001,
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'SALE_GENERAL_DISCOUNT_EXCEEDS_TOTAL' });
  });

  it('VENDEDOR puede crear venta de contado', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createCashSale(env, sellerAuth, {
      tipoVenta: 'CONTADO',
      idCliente: null,
      metodoPago: 'NEQUI',
      observaciones: null,
      detalles: [{ idVariante: 'var_1', cantidad: 2 }],
    });

    expect(result.total).toBe(100000);
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(1);
  });

  it('ADMINISTRADOR crea venta a credito, descuenta stock y crea credito sin pago ni abono', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, adminAuth, {
      tipoVenta: 'CREDITO',
      idCliente: 'cli_1',
      observaciones: 'Venta a credito',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000 }],
    });

    expect(result).toMatchObject({
      tipo_venta: 'CREDITO',
      estado_venta: 'COMPLETADA',
      total: 50000,
      saldo_pendiente: 50000,
      estado_credito: 'PENDIENTE',
      items_vendidos: 1,
      movimientos_creados: 1,
    });
    expect(mocks.sales[0]).toMatchObject({
      tipo_venta: 'CREDITO',
      valor_pagado_inicial: 0,
      saldo_pendiente: 50000,
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(2);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'VENTA',
      stock_antes: 3,
      stock_despues: 2,
      referencia_tipo: 'VENTA',
    });
    expect(mocks.credits[0]).toMatchObject({
      origen_credito: 'VENTA',
      id_venta: result.id_venta,
      monto_inicial: 50000,
      monto_abonado: 0,
      saldo_pendiente: 50000,
      estado_credito: 'PENDIENTE',
    });
    expect(mocks.creditDetails).toHaveLength(1);
    expect(mocks.payments).toHaveLength(0);
    expect(mocks.installments).toHaveLength(0);
    expect(mocks.adjustments).toHaveLength(0);
    expect(mocks.images).toHaveLength(0);
    expect(mocks.labels).toHaveLength(0);
  });

  it('crea credito por el total final despues de descuentos', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, adminAuth, {
      tipoVenta: 'CREDITO',
      idCliente: 'cli_1',
      descuentoGeneral: 5000,
      observaciones: 'Credito con descuento',
      detalles: [{ idVariante: 'var_1', cantidad: 2, descuento: 10000 }],
    });

    expect(result).toMatchObject({
      tipo_venta: 'CREDITO',
      total: 85000,
      saldo_pendiente: 85000,
    });
    expect(mocks.credits[0]).toMatchObject({
      monto_inicial: 85000,
      saldo_pendiente: 85000,
    });
    expect(mocks.installments).toHaveLength(0);
    expect(mocks.adjustments).toHaveLength(0);
  });

  it('VENDEDOR puede crear venta a credito', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, sellerAuth, {
      tipoVenta: 'CREDITO',
      idCliente: 'cli_1',
      observaciones: null,
      detalles: [{ idVariante: 'var_1', cantidad: 2 }],
    });

    expect(result.total).toBe(100000);
    expect(mocks.sales[0]?.id_usuario).toBe('usr_seller');
    expect(mocks.credits[0]?.saldo_pendiente).toBe(100000);
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(1);
  });

  it('venta a credito exige cliente activo', async () => {
    await expect(
      createSale(env, adminAuth, {
        tipoVenta: 'CREDITO',
        idCliente: 'missing',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' });

    mocks.clients = [{ id_cliente: 'cli_1', estado: 'INACTIVO' }];

    await expect(
      createSale(env, adminAuth, {
        tipoVenta: 'CREDITO',
        idCliente: 'cli_1',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'CLIENT_INACTIVE' });
  });

  it('GET de venta refleja venta a credito sin pagos', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, adminAuth, {
      tipoVenta: 'CREDITO',
      idCliente: 'cli_1',
      observaciones: 'Venta a credito',
      detalles: [{ idVariante: 'var_1', cantidad: 1 }],
    });

    const sale = await getSaleById(env, adminAuth, result.id_venta);

    expect(sale).toMatchObject({
      tipoVenta: 'CREDITO',
      saldoPendiente: 50000,
      valorPagadoInicial: 0,
    });
    expect(sale.pagos).toHaveLength(0);
    expect(sale.resumen.pagosRegistrados).toBe(0);
  });

  it('ADMINISTRADOR crea venta mixta con pago inicial y credito por saldo restante', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, adminAuth, {
      tipoVenta: 'MIXTA',
      idCliente: 'cli_1',
      valorPagadoInicial: 20000,
      metodoPago: 'EFECTIVO',
      observaciones: 'Venta mixta',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000 }],
    });

    expect(result).toMatchObject({
      tipo_venta: 'MIXTA',
      total: 50000,
      valor_pagado_inicial: 20000,
      saldo_pendiente: 30000,
      estado_credito: 'PENDIENTE',
      items_vendidos: 1,
      movimientos_creados: 1,
    });
    expect(mocks.payments[0]).toMatchObject({
      metodo_pago: 'EFECTIVO',
      valor_pagado: 20000,
      estado_pago: 'ACTIVO',
    });
    expect(mocks.credits[0]).toMatchObject({
      origen_credito: 'VENTA',
      id_venta: result.id_venta,
      monto_inicial: 30000,
      monto_abonado: 0,
      saldo_pendiente: 30000,
      estado_credito: 'PENDIENTE',
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(2);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'VENTA',
      stock_antes: 3,
      stock_despues: 2,
      referencia_tipo: 'VENTA',
    });
    expect(mocks.installments).toHaveLength(0);
    expect(mocks.adjustments).toHaveLength(0);
    expect(mocks.images).toHaveLength(0);
    expect(mocks.labels).toHaveLength(0);
  });

  it('VENDEDOR puede crear venta mixta', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, sellerAuth, {
      tipoVenta: 'MIXTA',
      idCliente: 'cli_1',
      valorPagadoInicial: 30000,
      metodoPago: 'NEQUI',
      observaciones: null,
      detalles: [{ idVariante: 'var_1', cantidad: 2 }],
    });

    expect(result).toMatchObject({
      total: 100000,
      valor_pagado_inicial: 30000,
      saldo_pendiente: 70000,
    });
    expect(mocks.sales[0]?.id_usuario).toBe('usr_seller');
    expect(mocks.credits[0]?.saldo_pendiente).toBe(70000);
  });

  it('calcula pago inicial y saldo de mixta desde el total final con descuentos', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, adminAuth, {
      tipoVenta: 'MIXTA',
      idCliente: 'cli_1',
      valorPagadoInicial: 25000,
      metodoPago: 'NEQUI',
      descuentoGeneral: 5000,
      observaciones: 'Mixta con descuento',
      detalles: [{ idVariante: 'var_1', cantidad: 2, descuento: 10000 }],
    });

    expect(result).toMatchObject({
      total: 85000,
      valor_pagado_inicial: 25000,
      saldo_pendiente: 60000,
    });
    expect(mocks.sales[0]).toMatchObject({
      subtotal: 100000,
      descuento: 15000,
      total: 85000,
      valor_pagado_inicial: 25000,
      saldo_pendiente: 60000,
    });
    expect(mocks.payments[0]).toMatchObject({ valor_pagado: 25000 });
    expect(mocks.credits[0]).toMatchObject({
      monto_inicial: 60000,
      saldo_pendiente: 60000,
    });
  });

  it('venta mixta rechaza pago inicial mayor o igual al total', async () => {
    await expect(
      createSale(env, adminAuth, {
        tipoVenta: 'MIXTA',
        idCliente: 'cli_1',
        valorPagadoInicial: 50000,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'MIXED_SALE_INITIAL_PAYMENT_MUST_BE_LESS_THAN_TOTAL' });
  });

  it('GET de venta mixta refleja pago inicial y saldo pendiente', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    const result = await createSale(env, adminAuth, {
      tipoVenta: 'MIXTA',
      idCliente: 'cli_1',
      valorPagadoInicial: 20000,
      metodoPago: 'TRANSFERENCIA',
      observaciones: 'Venta mixta',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000 }],
    });

    const sale = await getSaleById(env, adminAuth, result.id_venta);
    const payments = await listSalePayments(env, adminAuth, result.id_venta);

    expect(sale).toMatchObject({
      tipoVenta: 'MIXTA',
      total: 50000,
      valorPagadoInicial: 20000,
      saldoPendiente: 30000,
    });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      metodoPago: 'TRANSFERENCIA',
      monto: 20000,
    });
  });

  it('valida cliente activo si viene informado', async () => {
    mocks.clients = [{ id_cliente: 'cli_inactivo', estado: 'INACTIVO' }];

    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: 'missing',
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' });

    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: 'cli_inactivo',
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'CLIENT_INACTIVE' });
  });

  it('rechaza variante inexistente, inactiva o producto inactivo', async () => {
    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'missing', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'SALE_VARIANT_NOT_FOUND' });

    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_inactiva', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_INACTIVE' });

    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_producto_inactivo', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_INACTIVE' });
  });

  it('rechaza stock insuficiente y no permite stock negativo', async () => {
    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_sin_stock', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });

    expect(
      mocks.variants.find((variant) => variant.id_variante === 'var_sin_stock')?.stock_actual,
    ).toBe(0);
    expect(mocks.movements).toHaveLength(0);
  });

  it('congela precio y datos basicos en detalle', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    await createCashSale(env, adminAuth, {
      tipoVenta: 'CONTADO',
      idCliente: null,
      metodoPago: 'EFECTIVO',
      observaciones: null,
      detalles: [{ idVariante: 'var_1', cantidad: 1 }],
    });

    expect(mocks.details[0]).toMatchObject({
      nombre_producto: 'Blusa',
      sku: 'SKU-1',
      talla: 'M',
      color: 'Azul',
      codigo_qr: 'NTV-VAR-000001',
      precio_unitario: 50000,
      subtotal: 50000,
    });
  });

  it('no crea credito, abono, etiquetas ni imagenes', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];

    await createCashSale(env, adminAuth, {
      tipoVenta: 'CONTADO',
      idCliente: null,
      metodoPago: 'EFECTIVO',
      observaciones: null,
      detalles: [{ idVariante: 'var_1', cantidad: 1 }],
    });

    expect(mocks.credits).toHaveLength(0);
    expect(mocks.installments).toHaveLength(0);
    expect(mocks.labels).toHaveLength(0);
    expect(mocks.images).toHaveLength(0);
  });

  it('rechaza resultado inconsistente despues del batch', async () => {
    mocks.sales = [];
    mocks.payments = [];
    mocks.details = [];
    mocks.failPersistence = true;

    await expect(
      createCashSale(env, adminAuth, {
        tipoVenta: 'CONTADO',
        idCliente: null,
        metodoPago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ idVariante: 'var_1', cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'SALE_NOT_APPLIED' });
  });

  it('ADMINISTRADOR y VENDEDOR pueden listar ventas con filtros', async () => {
    mocks.sales.push(buildSale({ id_venta: 'ven_2', tipo_venta: 'CREDITO', id_cliente: 'cli_2' }));

    const adminResult = await listSales(env, adminAuth, {
      tipoVenta: 'CONTADO',
      limit: 10,
      offset: 0,
    });
    const sellerResult = await listSales(env, sellerAuth, { limit: 50, offset: 0 });

    expect(adminResult).toHaveLength(1);
    expect(sellerResult).toHaveLength(2);
    expect(mocks.lastListFilters).toMatchObject({ limit: 50, offset: 0 });
  });

  it('consulta detalle de venta con detalles y pagos congelados', async () => {
    const beforeStock = mocks.variants[0]?.stock_actual;
    const beforeMovements = mocks.movements.length;
    const beforePayments = mocks.payments.length;

    const sale = await getSaleById(env, adminAuth, 'ven_1');

    expect(sale.detalles[0]).toMatchObject({
      nombreProducto: 'Blusa congelada',
      sku: 'SKU-CONGELADO',
      codigoQr: 'NTV-VAR-000001',
      precioUnitario: 50000,
    });
    expect(sale.pagos).toHaveLength(1);
    expect(mocks.variants[0]?.stock_actual).toBe(beforeStock);
    expect(mocks.movements).toHaveLength(beforeMovements);
    expect(mocks.payments).toHaveLength(beforePayments);
    expect(mocks.credits).toHaveLength(0);
  });

  it('venta inexistente responde error claro', async () => {
    await expect(getSaleById(env, sellerAuth, 'missing')).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
      status: 404,
    });
  });

  it('consulta pagos de venta correctamente sin modificar datos', async () => {
    const beforeStock = mocks.variants[0]?.stock_actual;
    const beforeMovements = mocks.movements.length;
    const beforePayments = mocks.payments.length;

    const payments = await listSalePayments(env, sellerAuth, 'ven_1');

    expect(payments[0]).toMatchObject({
      idPago: 'pag_1',
      idVenta: 'ven_1',
      metodoPago: 'EFECTIVO',
      monto: 50000,
      estadoPago: 'ACTIVO',
    });
    expect(mocks.variants[0]?.stock_actual).toBe(beforeStock);
    expect(mocks.movements).toHaveLength(beforeMovements);
    expect(mocks.payments).toHaveLength(beforePayments);
  });

  it('pagos de venta inexistente responden error claro', async () => {
    await expect(listSalePayments(env, adminAuth, 'missing')).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
    });
  });

  it('ADMINISTRADOR anula venta de contado, devuelve stock, crea movimiento y anula pagos', async () => {
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 2;

    const result = await cancelSale(env, adminAuth, 'ven_1', {
      motivoAnulacion: 'Cliente cancelo la compra',
    });

    expect(result).toMatchObject({
      id_venta: 'ven_1',
      estado_venta: 'ANULADA',
      items_revertidos: 1,
      movimientos_creados: 1,
      pagos_anulados: 1,
      total_unidades_devuelto: 1,
    });
    expect(mocks.sales[0]?.estado_venta).toBe('ANULADA');
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(3);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'ANULACION_VENTA',
      stock_antes: 2,
      stock_despues: 3,
      referencia_tipo: 'ANULACION_VENTA',
    });
    expect(mocks.payments[0]).toMatchObject({
      estado_pago: 'ANULADO',
      motivo_anulacion: 'Cliente cancelo la compra',
    });
  });

  it('ADMINISTRADOR anula venta a credito sin abonos ni ajustes', async () => {
    mocks.sales[0] = buildSale({
      tipo_venta: 'CREDITO',
      valor_pagado_inicial: 0,
      saldo_pendiente: 50000,
    });
    mocks.payments = [];
    mocks.credits = [
      {
        id_credito: 'cre_1',
        id_cliente: 'cli_1',
        id_venta: 'ven_1',
        origen_credito: 'VENTA',
        monto_inicial: 50000,
        monto_abonado: 0,
        saldo_pendiente: 50000,
        estado_credito: 'PENDIENTE',
      },
    ];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 2;

    const result = await cancelSale(env, adminAuth, 'ven_1', {
      motivoAnulacion: 'Cliente solicito cancelar la venta',
    });

    expect(result).toMatchObject({
      id_venta: 'ven_1',
      estado_venta: 'ANULADA',
      id_credito: 'cre_1',
      credito_anulado: true,
      pagos_anulados: 0,
      movimientos_creados: 1,
    });
    expect(mocks.sales[0]?.estado_venta).toBe('ANULADA');
    expect(mocks.credits[0]).toMatchObject({
      estado_credito: 'ANULADO',
      saldo_pendiente: 0,
      monto_inicial: 50000,
      monto_abonado: 0,
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(3);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'ANULACION_VENTA',
      referencia_tipo: 'ANULACION_VENTA',
    });
    expect(mocks.installments).toHaveLength(0);
    expect(mocks.adjustments).toHaveLength(0);
  });

  it('ADMINISTRADOR anula venta mixta y marca pago inicial como anulado', async () => {
    mocks.sales[0] = buildSale({
      tipo_venta: 'MIXTA',
      total: 100000,
      valor_pagado_inicial: 40000,
      saldo_pendiente: 60000,
    });
    mocks.payments = [
      buildPayment({
        id_pago_venta: 'pag_mixta',
        id_venta: 'ven_1',
        valor_pagado: 40000,
        metodo_pago: 'NEQUI',
      }),
    ];
    mocks.credits = [
      {
        id_credito: 'cre_1',
        id_cliente: 'cli_1',
        id_venta: 'ven_1',
        origen_credito: 'VENTA',
        monto_inicial: 60000,
        monto_abonado: 0,
        saldo_pendiente: 60000,
        estado_credito: 'PENDIENTE',
      },
    ];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 2;

    const result = await cancelSale(env, adminAuth, 'ven_1', {
      motivoAnulacion: 'Cliente solicito cancelar la venta',
    });

    expect(result).toMatchObject({
      id_credito: 'cre_1',
      credito_anulado: true,
      pagos_anulados: 1,
      movimientos_creados: 1,
    });
    expect(mocks.payments[0]).toMatchObject({
      estado_pago: 'ANULADO',
      motivo_anulacion: 'Cliente solicito cancelar la venta',
    });
    expect(mocks.credits[0]).toMatchObject({
      estado_credito: 'ANULADO',
      saldo_pendiente: 0,
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(3);
  });

  it('bloquea ventas con credito que ya tiene abonos o ajustes', async () => {
    mocks.sales[0] = buildSale({
      tipo_venta: 'CREDITO',
      valor_pagado_inicial: 0,
      saldo_pendiente: 50000,
    });
    mocks.payments = [];
    mocks.credits = [
      {
        id_credito: 'cre_1',
        id_cliente: 'cli_1',
        id_venta: 'ven_1',
        origen_credito: 'VENTA',
        monto_inicial: 50000,
        monto_abonado: 0,
        saldo_pendiente: 50000,
        estado_credito: 'PENDIENTE',
      },
    ];
    mocks.installments = [{ id_abono: 'abo_1' }];

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'VENTA_CON_CREDITO_MODIFICADO' });

    mocks.installments = [];
    mocks.adjustments = [{ id_ajuste: 'aju_1' }];

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'VENTA_CON_CREDITO_MODIFICADO' });
  });

  it('rechaza credito o mixta sin datos asociados requeridos', async () => {
    mocks.sales[0] = buildSale({ tipo_venta: 'CREDITO', saldo_pendiente: 50000 });
    mocks.payments = [];
    mocks.credits = [];

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'SALE_CREDIT_NOT_FOUND' });

    mocks.sales[0] = buildSale({
      tipo_venta: 'MIXTA',
      valor_pagado_inicial: 40000,
      saldo_pendiente: 60000,
    });
    mocks.credits = [
      {
        id_credito: 'cre_1',
        id_cliente: 'cli_1',
        id_venta: 'ven_1',
        origen_credito: 'VENTA',
        monto_inicial: 60000,
        monto_abonado: 0,
        saldo_pendiente: 60000,
        estado_credito: 'PENDIENTE',
      },
    ];

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'SALE_MIXED_INITIAL_PAYMENT_NOT_FOUND' });
  });

  it('rechaza venta inexistente o ya anulada', async () => {
    await expect(
      cancelSale(env, adminAuth, 'missing', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'SALE_NOT_FOUND' });

    mocks.sales[0]!.estado_venta = 'ANULADA';
    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'SALE_ALREADY_CANCELLED' });
  });

  it('rechaza venta sin detalles o con variante faltante', async () => {
    mocks.details = [];

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'SALE_DETAILS_NOT_FOUND' });

    mocks.details = [buildDetail({ id_variante: 'missing' })];

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Error' }),
    ).rejects.toMatchObject({ code: 'SALE_VARIANT_NOT_FOUND' });
  });

  it('no permite anulacion doble ni crea creditos, abonos, imagenes o etiquetas', async () => {
    await cancelSale(env, adminAuth, 'ven_1', {
      motivoAnulacion: 'Cliente cancelo la compra',
    });

    await expect(
      cancelSale(env, adminAuth, 'ven_1', { motivoAnulacion: 'Segundo intento' }),
    ).rejects.toMatchObject({ code: 'SALE_ALREADY_CANCELLED' });

    expect(mocks.credits).toHaveLength(0);
    expect(mocks.installments).toHaveLength(0);
    expect(mocks.images).toHaveLength(0);
    expect(mocks.labels).toHaveLength(0);
  });

  it('GET de venta y pagos reflejan anulacion', async () => {
    await cancelSale(env, adminAuth, 'ven_1', {
      motivoAnulacion: 'Cliente cancelo la compra',
    });

    const sale = await getSaleById(env, adminAuth, 'ven_1');
    const payments = await listSalePayments(env, adminAuth, 'ven_1');

    expect(sale.estadoVenta).toBe('ANULADA');
    expect(sale.motivoAnulacion).toBe('Cliente cancelo la compra');
    expect(payments[0]?.estadoPago).toBe('ANULADO');
  });
});
