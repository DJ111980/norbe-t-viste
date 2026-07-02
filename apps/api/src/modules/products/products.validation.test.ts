import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import {
  normalizeProductName,
  validateCreateProductInput,
  validateListProductsFilters,
  validateUpdateProductInput,
  validateUpdateProductStatusInput,
} from './products.validation';

describe('products validation', () => {
  it('crear producto con datos validos', () => {
    expect(
      validateCreateProductInput({
        nombre_producto: '  Blusa Roja  ',
        id_categoria: 'cat_1',
        descripcion: '',
        visible_catalogo: true,
      }),
    ).toEqual({
      nombreProducto: 'Blusa Roja',
      nombreNormalizado: 'blusa roja',
      idCategoria: 'cat_1',
      descripcion: null,
      marca: null,
      referencia: null,
      visibleCatalogo: true,
    });
  });

  it('crear producto genera nombre_normalizado', () => {
    expect(normalizeProductName('  Blusa   Roja  ')).toBe('blusa roja');
  });

  it('crear producto rechaza nombre vacio', () => {
    expect(() =>
      validateCreateProductInput({ nombre_producto: ' ', id_categoria: 'cat_1' }),
    ).toThrow(ApiError);
  });

  it('crear producto no acepta stock ni imagen', () => {
    expect(() =>
      validateCreateProductInput({
        nombre_producto: 'Blusa',
        id_categoria: 'cat_1',
        stock: 5,
      }),
    ).toThrow(ApiError);

    expect(() =>
      validateCreateProductInput({
        nombre_producto: 'Blusa',
        id_categoria: 'cat_1',
        imagen_principal: 'r2/key',
      }),
    ).toThrow(ApiError);
  });

  it('editar producto rechaza payload vacio y recalcula nombre_normalizado', () => {
    expect(() => validateUpdateProductInput({})).toThrow(ApiError);
    expect(validateUpdateProductInput({ nombre_producto: '  Jean   Azul ' })).toEqual({
      nombreProducto: 'Jean   Azul',
      nombreNormalizado: 'jean azul',
    });
  });

  it('valida estado de producto', () => {
    expect(validateUpdateProductStatusInput({ estado: 'INACTIVO' })).toEqual({
      estado: 'INACTIVO',
    });
    expect(() => validateUpdateProductStatusInput({ estado: 'INACTIVA' })).toThrow(ApiError);
  });

  it('listado aplica filtros basicos', () => {
    const params = new URLSearchParams({
      buscar: 'blusa',
      estado: 'ACTIVO',
      categoria: 'cat_1',
      visible_catalogo: 'true',
      limit: '500',
      offset: '10',
    });

    expect(validateListProductsFilters(params)).toEqual({
      buscar: 'blusa',
      estado: 'ACTIVO',
      categoria: 'cat_1',
      visibleCatalogo: true,
      limit: 100,
      offset: 10,
    });
  });
});
