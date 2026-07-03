import { describe, expect, it } from 'vitest';
import { validateCreateSaleReturnInput } from './returns.validation';

describe('returns validation', () => {
  it('valida devolucion de venta', () => {
    const input = validateCreateSaleReturnInput({
      motivo: ' Cliente devuelve una prenda ',
      detalles: [{ id_detalle_venta: ' det_1 ', cantidad_devuelta: 1 }],
    });

    expect(input).toEqual({
      motivo: 'Cliente devuelve una prenda',
      detalles: [{ idDetalleVenta: 'det_1', cantidadDevuelta: 1 }],
    });
  });

  it('rechaza devolucion invalida', () => {
    expect(() => validateCreateSaleReturnInput(null)).toThrowError(
      expect.objectContaining({ code: 'DEVOLUCION_INVALIDA' }),
    );

    expect(() =>
      validateCreateSaleReturnInput({
        motivo: ' ',
        detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'MOTIVO_DEVOLUCION_REQUERIDO' }));

    expect(() => validateCreateSaleReturnInput({ motivo: 'x', detalles: [] })).toThrowError(
      expect.objectContaining({ code: 'DETALLES_DEVOLUCION_REQUERIDOS' }),
    );

    expect(() =>
      validateCreateSaleReturnInput({
        motivo: 'x',
        detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 0 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'CANTIDAD_DEVOLUCION_INVALIDA' }));

    expect(() =>
      validateCreateSaleReturnInput({
        motivo: 'x',
        detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: -1 }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'CANTIDAD_DEVOLUCION_INVALIDA' }));
  });
});
