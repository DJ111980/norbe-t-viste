import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import {
  normalizeProviderName,
  validateCreateProviderInput,
  validateListProvidersFilters,
  validateUpdateProviderInput,
  validateUpdateProviderStatusInput,
} from './providers.validation';

describe('providers validation', () => {
  it('crear proveedor solo con nombre', () => {
    expect(
      validateCreateProviderInput({
        nombre_proveedor: '  Moda Cali  ',
      }),
    ).toMatchObject({
      nombreProveedor: 'Moda Cali',
      nombreNormalizado: 'moda cali',
      telefonoPrincipal: null,
      ciudad: null,
    });
  });

  it('crear convierte opcionales vacios a null', () => {
    expect(
      validateCreateProviderInput({
        nombre_proveedor: 'Moda Cali',
        telefono_principal: '',
        ciudad: '   ',
        numero_documento: '',
      }),
    ).toMatchObject({
      telefonoPrincipal: null,
      ciudad: null,
      numeroDocumento: null,
    });
  });

  it('crear rechaza nombre vacio', () => {
    expect(() => validateCreateProviderInput({ nombre_proveedor: ' ' })).toThrow(ApiError);
  });

  it('crear rechaza correo invalido', () => {
    expect(() =>
      validateCreateProviderInput({
        nombre_proveedor: 'Moda Cali',
        correo: 'correo-invalido',
      }),
    ).toThrow(ApiError);
  });

  it('crear rechaza modo_envio invalido', () => {
    expect(() =>
      validateCreateProviderInput({
        nombre_proveedor: 'Moda Cali',
        modo_envio: 'AVION',
      }),
    ).toThrow(ApiError);
  });

  it('crear genera correctamente nombre_normalizado', () => {
    expect(normalizeProviderName('  Moda   Cali  ')).toBe('moda cali');
  });

  it('editar rechaza payload vacio', () => {
    expect(() => validateUpdateProviderInput({})).toThrow(ApiError);
  });

  it('editar recalcula nombre_normalizado', () => {
    expect(
      validateUpdateProviderInput({
        nombre_proveedor: '  Moda   Bogota ',
      }),
    ).toEqual({
      nombreProveedor: 'Moda   Bogota',
      nombreNormalizado: 'moda bogota',
    });
  });

  it('valida estado de proveedor', () => {
    expect(validateUpdateProviderStatusInput({ estado: 'INACTIVO' })).toEqual({
      estado: 'INACTIVO',
    });
    expect(() => validateUpdateProviderStatusInput({ estado: 'ELIMINADO' })).toThrow(ApiError);
  });

  it('listado aplica filtros basicos', () => {
    const params = new URLSearchParams({
      buscar: 'moda',
      estado: 'ACTIVO',
      ciudad: 'Cali',
      telefono: '3001234567',
      modo_envio: 'ENCOMIENDA',
      limit: '500',
      offset: '10',
    });

    expect(validateListProvidersFilters(params)).toEqual({
      buscar: 'moda',
      estado: 'ACTIVO',
      ciudad: 'Cali',
      telefono: '3001234567',
      modoEnvio: 'ENCOMIENDA',
      limit: 100,
      offset: 10,
    });
  });
});
