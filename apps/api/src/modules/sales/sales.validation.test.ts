import { describe, expect, it } from 'vitest';
import {
  validateCancelCashSaleInput,
  validateCreateCashSaleInput,
  validateListSalesFilters,
} from './sales.validation';

describe('sales validation', () => {
  it('valida venta de contado con detalle minimo', () => {
    const input = validateCreateCashSaleInput({
      tipo_venta: 'CONTADO',
      id_cliente: null,
      metodo_pago: 'EFECTIVO',
      observaciones: ' Venta de contado ',
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
    });

    expect(input).toEqual({
      tipoVenta: 'CONTADO',
      idCliente: null,
      metodoPago: 'EFECTIVO',
      observaciones: 'Venta de contado',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000 }],
    });
  });

  it('rechaza tipo CREDITO y MIXTA en esta fase', () => {
    expect(() =>
      validateCreateCashSaleInput({
        tipo_venta: 'CREDITO',
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'ONLY_CASH_SALE_ALLOWED' }));

    expect(() =>
      validateCreateCashSaleInput({
        tipo_venta: 'MIXTA',
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'ONLY_CASH_SALE_ALLOWED' }));
  });

  it('rechaza venta sin detalles', () => {
    expect(() =>
      validateCreateCashSaleInput({
        tipo_venta: 'CONTADO',
        metodo_pago: 'EFECTIVO',
        detalles: [],
      }),
    ).toThrowError(expect.objectContaining({ code: 'SALE_DETAILS_REQUIRED' }));
  });

  it('rechaza cantidad menor o igual a cero', () => {
    expect(() =>
      validateCreateCashSaleInput({
        tipo_venta: 'CONTADO',
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 0 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SALE_QUANTITY' }));
  });

  it('rechaza metodo de pago invalido y variante duplicada', () => {
    expect(() =>
      validateCreateCashSaleInput({
        tipo_venta: 'CONTADO',
        metodo_pago: 'BITCOIN',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PAYMENT_METHOD' }));

    expect(() =>
      validateCreateCashSaleInput({
        tipo_venta: 'CONTADO',
        metodo_pago: 'EFECTIVO',
        detalles: [
          { id_variante: 'var_1', cantidad: 1 },
          { id_variante: 'var_1', cantidad: 1 },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: 'DUPLICATED_SALE_VARIANT' }));
  });

  it('valida filtros de listado y paginacion', () => {
    const filters = validateListSalesFilters(
      new URLSearchParams({
        buscar: 'VTA',
        estado: 'COMPLETADA',
        tipo_venta: 'CONTADO',
        cliente: 'cli_1',
        vendedor: 'usr_1',
        fecha_desde: '2026-07-01',
        fecha_hasta: '2026-07-02',
        limit: '500',
        offset: '10',
      }),
    );

    expect(filters).toMatchObject({
      buscar: 'VTA',
      estado: 'COMPLETADA',
      tipoVenta: 'CONTADO',
      cliente: 'cli_1',
      vendedor: 'usr_1',
      limit: 100,
      offset: 10,
    });
  });

  it('rechaza filtros invalidos de listado', () => {
    expect(() =>
      validateListSalesFilters(new URLSearchParams({ estado: 'PENDIENTE' })),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SALE_STATUS' }));

    expect(() =>
      validateListSalesFilters(new URLSearchParams({ tipo_venta: 'REGALO' })),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SALE_TYPE' }));
  });

  it('valida y rechaza motivo de anulacion vacio', () => {
    expect(validateCancelCashSaleInput({ motivo_anulacion: ' Cliente cancelo ' })).toMatchObject({
      motivoAnulacion: 'Cliente cancelo',
    });

    expect(() => validateCancelCashSaleInput({ motivo_anulacion: '   ' })).toThrowError(
      expect.objectContaining({ code: 'SALE_CANCELLATION_REASON_REQUIRED' }),
    );
  });
});
