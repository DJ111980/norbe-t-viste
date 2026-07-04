import { describe, expect, it } from 'vitest';
import {
  validateCancelSaleInput,
  validateCreateCashSaleInput,
  validateCreateSaleInput,
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
      descuentoGeneral: 0,
      observaciones: 'Venta de contado',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000, descuento: 0 }],
    });
  });

  it('valida venta a credito con cliente obligatorio y sin metodo de pago', () => {
    const input = validateCreateSaleInput({
      tipo_venta: 'CREDITO',
      id_cliente: 'cli_1',
      observaciones: ' Venta a credito ',
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
    });

    expect(input).toEqual({
      tipoVenta: 'CREDITO',
      idCliente: 'cli_1',
      descuentoGeneral: 0,
      observaciones: 'Venta a credito',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 50000, descuento: 0 }],
    });
  });

  it('valida venta mixta con pago inicial', () => {
    const input = validateCreateSaleInput({
      tipo_venta: 'MIXTA',
      id_cliente: 'cli_1',
      valor_pagado_inicial: 40000,
      metodo_pago: 'EFECTIVO',
      observaciones: ' Venta mixta ',
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 100000 }],
    });

    expect(input).toEqual({
      tipoVenta: 'MIXTA',
      idCliente: 'cli_1',
      valorPagadoInicial: 40000,
      metodoPago: 'EFECTIVO',
      descuentoGeneral: 0,
      observaciones: 'Venta mixta',
      detalles: [{ idVariante: 'var_1', cantidad: 1, precioUnitario: 100000, descuento: 0 }],
    });
  });

  it('valida descuentos de linea y general', () => {
    const input = validateCreateSaleInput({
      tipo_venta: 'CONTADO',
      metodo_pago: 'EFECTIVO',
      descuento_general: 5000,
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000, descuento: 3000 }],
    });

    expect(input).toMatchObject({
      descuentoGeneral: 5000,
      detalles: [{ descuento: 3000 }],
    });
  });

  it('rechaza pago enviado en credito y body invalido de mixta', () => {
    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'CREDITO',
        id_cliente: 'cli_1',
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'CREDIT_SALE_PAYMENT_NOT_ALLOWED' }));

    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'CREDITO',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'CREDIT_SALE_CLIENT_REQUIRED' }));

    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'MIXTA',
        valor_pagado_inicial: 40000,
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'MIXED_SALE_CLIENT_REQUIRED' }));

    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'MIXTA',
        id_cliente: 'cli_1',
        valor_pagado_inicial: 0,
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_MIXED_SALE_INITIAL_PAYMENT' }));

    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'MIXTA',
        id_cliente: 'cli_1',
        valor_pagado_inicial: 10000,
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'PAYMENT_METHOD_REQUIRED' }));

    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'MIXTA',
        id_cliente: 'cli_1',
        valor_pagado_inicial: 10000,
        metodo_pago: 'BITCOIN',
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PAYMENT_METHOD' }));

    expect(() =>
      validateCreateSaleInput({
        tipo_venta: 'MIXTA',
        id_cliente: 'cli_1',
        valor_pagado_inicial: 10000,
        metodo_pago: 'EFECTIVO',
        abonos: [{ valor: 1000 }],
        detalles: [{ id_variante: 'var_1', cantidad: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'SALE_INSTALLMENTS_NOT_ALLOWED' }));
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
    expect(validateCancelSaleInput({ motivo_anulacion: ' Cliente cancelo ' })).toMatchObject({
      motivoAnulacion: 'Cliente cancelo',
    });

    expect(() => validateCancelSaleInput({ motivo_anulacion: '   ' })).toThrowError(
      expect.objectContaining({ code: 'SALE_CANCELLATION_REASON_REQUIRED' }),
    );
  });
});
