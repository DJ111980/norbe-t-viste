import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  ReturnSaleDetailAvailabilityRecord,
  ReturnSaleRecord,
  SaleReturnDetailRecord,
  SaleReturnViewRecord,
} from './returns.types';

const mocks = vi.hoisted(() => ({
  sale: null as ReturnSaleRecord | null,
  details: [] as ReturnSaleDetailAvailabilityRecord[],
  returns: [] as SaleReturnViewRecord[],
  movements: [] as Array<{
    id_movimiento: string;
    id_variante: string;
    tipo_movimiento: string;
    referencia_tipo: string;
    referencia_id: string;
    cantidad: number;
    stock_antes: number;
    stock_despues: number;
  }>,
  payments: [] as unknown[],
  credits: [] as unknown[],
  creditPayments: [] as unknown[],
  creditAdjustments: [] as unknown[],
}));

vi.mock('./returns.repository', () => ({
  findSaleForReturn: vi.fn(async () => mocks.sale),
  findDetailsForReturn: vi.fn(async (_env: ApiEnv, ids: string[]) =>
    mocks.details.filter((detail) => ids.includes(detail.id_detalle_venta)),
  ),
  countSaleSideEffects: vi.fn(async () => ({
    paymentCount: mocks.payments.length,
    creditCount: mocks.credits.length,
    creditPaymentCount: mocks.creditPayments.length,
    creditAdjustmentCount: mocks.creditAdjustments.length,
  })),
  createSaleReturn: vi.fn(async (_env: ApiEnv, input) => {
    const returnDetails: SaleReturnDetailRecord[] = [];

    for (const detail of input.detalles) {
      const saleDetail = mocks.details.find(
        (item) => item.id_detalle_venta === detail.idDetalleVenta,
      );
      if (!saleDetail || saleDetail.stock_actual !== detail.stockAntes) return;

      saleDetail.stock_actual = detail.stockDespues;
      saleDetail.cantidad_devuelta_activa += detail.cantidadDevuelta;
      mocks.movements.push({
        id_movimiento: detail.idMovimiento,
        id_variante: detail.idVariante,
        tipo_movimiento: 'DEVOLUCION',
        referencia_tipo: 'DEVOLUCION',
        referencia_id: input.idDevolucion,
        cantidad: detail.cantidadDevuelta,
        stock_antes: detail.stockAntes,
        stock_despues: detail.stockDespues,
      });
      returnDetails.push({
        id_detalle_devolucion: detail.idDetalleDevolucion,
        id_devolucion: input.idDevolucion,
        id_detalle_venta: detail.idDetalleVenta,
        id_variante: detail.idVariante,
        cantidad_devuelta: detail.cantidadDevuelta,
        precio_unitario: detail.precioUnitario,
        subtotal_devuelto: detail.subtotalDevuelto,
        stock_antes: detail.stockAntes,
        stock_despues: detail.stockDespues,
        id_movimiento: detail.idMovimiento,
        creado_en: '2026-07-03',
      });
    }

    mocks.returns.push({
      id_devolucion: input.idDevolucion,
      id_venta: input.idVenta,
      tipo_venta: 'CONTADO',
      motivo: input.motivo,
      estado_devolucion: 'ACTIVA',
      total_devuelto: input.totalDevuelto,
      impacto_credito: 0,
      impacto_pago: input.impactoPago,
      creado_por: input.creadoPor,
      creado_en: '2026-07-03',
      anulado_por: null,
      anulado_en: null,
      motivo_anulacion: null,
      creado_por_nombre: 'Admin',
      creado_por_correo: 'admin@example.com',
      detalles: returnDetails,
    });
  }),
  getSaleReturnPersistenceStatus: vi.fn(
    async (_env: ApiEnv, idVenta: string, idDevolucion: string) => {
      const saleReturn = mocks.returns.find((item) => item.id_devolucion === idDevolucion);

      return {
        returnExists: Boolean(saleReturn),
        detailsCount: saleReturn?.detalles.length ?? 0,
        movementCount: mocks.movements.filter((item) => item.referencia_id === idDevolucion).length,
        stockMatchesCount:
          saleReturn?.detalles.filter((detail) => {
            const saleDetail = mocks.details.find(
              (item) => item.id_detalle_venta === detail.id_detalle_venta,
            );
            return saleDetail?.stock_actual === detail.stock_despues;
          }).length ?? 0,
        saleStatus: mocks.sale?.id_venta === idVenta ? mocks.sale.estado_venta : null,
        paymentCount: mocks.payments.length,
        creditCount: mocks.credits.length,
        creditPaymentCount: mocks.creditPayments.length,
        creditAdjustmentCount: mocks.creditAdjustments.length,
      };
    },
  ),
  listSaleReturns: vi.fn(async () => mocks.returns),
}));

const { createSaleReturn, listSaleReturns } = await import('./returns.service');

const env = {} as ApiEnv;
const adminAuth = { user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' } } as AuthContext;

function buildSale(overrides: Partial<ReturnSaleRecord> = {}): ReturnSaleRecord {
  return {
    id_venta: 'ven_1',
    tipo_venta: 'CONTADO',
    estado_venta: 'COMPLETADA',
    ...overrides,
  };
}

function buildDetail(
  overrides: Partial<ReturnSaleDetailAvailabilityRecord> = {},
): ReturnSaleDetailAvailabilityRecord {
  return {
    id_detalle_venta: 'det_1',
    id_venta: 'ven_1',
    id_variante: 'var_1',
    cantidad: 2,
    precio_unitario: 50000,
    cantidad_devuelta_activa: 0,
    stock_actual: 3,
    ...overrides,
  };
}

describe('returns service', () => {
  beforeEach(() => {
    mocks.sale = buildSale();
    mocks.details = [buildDetail()];
    mocks.returns = [];
    mocks.movements = [];
    mocks.payments = [{ id_pago_venta: 'pag_1' }];
    mocks.credits = [];
    mocks.creditPayments = [];
    mocks.creditAdjustments = [];
  });

  it('ADMINISTRADOR registra devolucion parcial CONTADO y devuelve stock', async () => {
    const result = await createSaleReturn(env, adminAuth, 'ven_1', {
      motivo: 'Cliente devuelve una prenda',
      detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
    });

    expect(result).toMatchObject({
      id_venta: 'ven_1',
      tipo_venta: 'CONTADO',
      estado_devolucion: 'ACTIVA',
      total_devuelto: 50000,
      impacto_credito: 0,
      impacto_pago: 50000,
      items_devueltos: 1,
      movimientos_creados: 1,
    });
    expect(mocks.details[0]).toMatchObject({ stock_actual: 4, cantidad_devuelta_activa: 1 });
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'DEVOLUCION',
      referencia_tipo: 'DEVOLUCION',
      referencia_id: result.id_devolucion,
      stock_antes: 3,
      stock_despues: 4,
    });
    expect(mocks.movements[0]?.tipo_movimiento).not.toBe('ANULACION_VENTA');
    expect(mocks.returns[0]?.detalles[0]).toMatchObject({
      id_movimiento: mocks.movements[0]?.id_movimiento,
      subtotal_devuelto: 50000,
    });
    expect(mocks.payments).toHaveLength(1);
    expect(mocks.credits).toHaveLength(0);
    expect(mocks.creditPayments).toHaveLength(0);
    expect(mocks.creditAdjustments).toHaveLength(0);
    expect(mocks.sale?.estado_venta).toBe('COMPLETADA');
  });

  it('GET lista devoluciones sin modificar stock', async () => {
    await createSaleReturn(env, adminAuth, 'ven_1', {
      motivo: 'Cliente devuelve una prenda',
      detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
    });
    const stockDespues = mocks.details[0]?.stock_actual;
    const result = await listSaleReturns(env, 'ven_1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      totalDevuelto: 50000,
      detalles: [{ id_movimiento: expect.any(String) }],
    });
    expect(mocks.details[0]?.stock_actual).toBe(stockDespues);
  });

  it('rechaza venta inexistente, no CONTADO o anulada', async () => {
    mocks.sale = null;
    await expect(
      createSaleReturn(env, adminAuth, 'missing', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'VENTA_NO_ENCONTRADA' });

    mocks.sale = buildSale({ tipo_venta: 'CREDITO' });
    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'DEVOLUCION_SOLO_CONTADO_POR_AHORA' });

    mocks.sale = buildSale({ tipo_venta: 'MIXTA' });
    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'DEVOLUCION_SOLO_CONTADO_POR_AHORA' });

    mocks.sale = buildSale({ estado_venta: 'ANULADA' });
    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'VENTA_ANULADA_NO_DEVOLUBLE' });
  });

  it('rechaza detalle ajeno, variante historica inexistente o exceso de cantidad', async () => {
    mocks.details = [buildDetail({ id_venta: 'ven_2' })];
    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'DETALLE_NO_PERTENECE_A_VENTA' });

    mocks.details = [];
    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'VARIANTE_HISTORICA_NO_ENCONTRADA' });

    mocks.details = [buildDetail({ cantidad_devuelta_activa: 1 })];
    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Error',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 2 }],
      }),
    ).rejects.toMatchObject({ code: 'CANTIDAD_DEVOLUCION_EXCEDE_DISPONIBLE' });
  });

  it('evita doble devolucion superior a disponible', async () => {
    await createSaleReturn(env, adminAuth, 'ven_1', {
      motivo: 'Primera devolucion',
      detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
    });

    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Segunda devolucion',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 2 }],
      }),
    ).rejects.toMatchObject({ code: 'CANTIDAD_DEVOLUCION_EXCEDE_DISPONIBLE' });
  });

  it('permite devolver stock aunque variante o producto hayan sido desactivados', async () => {
    mocks.details = [buildDetail()];

    await expect(
      createSaleReturn(env, adminAuth, 'ven_1', {
        motivo: 'Cliente devuelve una prenda',
        detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
      }),
    ).resolves.toMatchObject({ movimientos_creados: 1 });
  });
});
