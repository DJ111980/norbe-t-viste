import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import {
  normalizeVariantPart,
  validateCreateVariantInput,
  validateListVariantsFilters,
  validateUpdateVariantInput,
  validateUpdateVariantStatusInput,
} from './variants.validation';

describe('variants validation', () => {
  it('crear variante con talla y color', () => {
    expect(
      validateCreateVariantInput({
        talla: ' M ',
        color: ' Rojo Vino ',
        sku: 'SKU-1',
        precio_venta: 50000,
        precio_compra_referencia: 25000,
        stock_minimo: 2,
      }),
    ).toEqual({
      talla: 'M',
      color: 'Rojo Vino',
      tallaNormalizada: 'm',
      colorNormalizado: 'rojo vino',
      sku: 'SKU-1',
      precioVenta: 50000,
      precioCompraReferencia: 25000,
      stockMinimo: 2,
    });
  });

  it('crear variante sin talla ni color usa unica y sin-color', () => {
    const input = validateCreateVariantInput({});

    expect(input.tallaNormalizada).toBe('unica');
    expect(input.colorNormalizado).toBe('sin-color');
    expect(normalizeVariantPart('  Talla   M ', 'unica')).toBe('talla m');
  });

  it('crear variante rechaza stock_actual y precio negativo', () => {
    expect(() => validateCreateVariantInput({ stock_actual: 1 })).toThrow(ApiError);
    expect(() => validateCreateVariantInput({ precio_venta: -1 })).toThrow(ApiError);
  });

  it('editar variante rechaza payload vacio y campos prohibidos', () => {
    expect(() => validateUpdateVariantInput({})).toThrow(ApiError);
    expect(() => validateUpdateVariantInput({ codigo_qr: 'NTV-VAR-000001' })).toThrow(ApiError);
    expect(() => validateUpdateVariantInput({ stock_actual: 5 })).toThrow(ApiError);
  });

  it('editar variante recalcula talla y color normalizados', () => {
    expect(
      validateUpdateVariantInput({
        talla: ' Talla   M ',
        color: '',
      }),
    ).toEqual({
      talla: 'Talla   M',
      tallaNormalizada: 'talla m',
      color: null,
      colorNormalizado: 'sin-color',
    });
  });

  it('valida estado y filtros', () => {
    expect(validateUpdateVariantStatusInput({ estado: 'INACTIVA' })).toEqual({
      estado: 'INACTIVA',
    });
    expect(() => validateUpdateVariantStatusInput({ estado: 'INACTIVO' })).toThrow(ApiError);

    expect(
      validateListVariantsFilters(
        new URLSearchParams({
          buscar: 'blusa',
          estado: 'ACTIVA',
          producto: 'prd_1',
          stock_bajo: 'true',
          limit: '500',
          offset: '10',
        }),
      ),
    ).toEqual({
      buscar: 'blusa',
      estado: 'ACTIVA',
      producto: 'prd_1',
      talla: undefined,
      color: undefined,
      codigoQr: undefined,
      sku: undefined,
      stockBajo: true,
      limit: 100,
      offset: 10,
    });
  });
});
