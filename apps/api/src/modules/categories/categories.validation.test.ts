import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import {
  normalizeCategoryName,
  validateCreateCategoryInput,
  validateListCategoriesFilters,
  validateUpdateCategoryInput,
  validateUpdateCategoryStatusInput,
} from './categories.validation';

describe('categories validation', () => {
  it('crear categoria con nombre valido', () => {
    expect(
      validateCreateCategoryInput({
        nombre_categoria: '  Blusas  ',
      }),
    ).toEqual({
      nombreCategoria: 'Blusas',
      nombreNormalizado: 'blusas',
      descripcion: null,
    });
  });

  it('crear categoria genera nombre_normalizado', () => {
    expect(normalizeCategoryName('  Ropa   Interior  ')).toBe('ropa interior');
  });

  it('crear categoria rechaza nombre vacio', () => {
    expect(() => validateCreateCategoryInput({ nombre_categoria: ' ' })).toThrow(ApiError);
  });

  it('convierte descripcion vacia a null', () => {
    expect(
      validateCreateCategoryInput({
        nombre_categoria: 'Blusas',
        descripcion: '   ',
      }),
    ).toMatchObject({
      descripcion: null,
    });
  });

  it('editar categoria rechaza payload vacio', () => {
    expect(() => validateUpdateCategoryInput({})).toThrow(ApiError);
  });

  it('editar categoria recalcula nombre_normalizado', () => {
    expect(
      validateUpdateCategoryInput({
        nombre_categoria: '  Ropa   Deportiva ',
      }),
    ).toEqual({
      nombreCategoria: 'Ropa   Deportiva',
      nombreNormalizado: 'ropa deportiva',
    });
  });

  it('valida estado de categoria con ACTIVA e INACTIVA', () => {
    expect(validateUpdateCategoryStatusInput({ estado: 'INACTIVA' })).toEqual({
      estado: 'INACTIVA',
    });
    expect(() => validateUpdateCategoryStatusInput({ estado: 'INACTIVO' })).toThrow(ApiError);
  });

  it('listado aplica filtros basicos', () => {
    const params = new URLSearchParams({
      buscar: 'blusa',
      estado: 'ACTIVA',
      limit: '500',
      offset: '10',
    });

    expect(validateListCategoriesFilters(params)).toEqual({
      buscar: 'blusa',
      estado: 'ACTIVA',
      limit: 100,
      offset: 10,
    });
  });
});
