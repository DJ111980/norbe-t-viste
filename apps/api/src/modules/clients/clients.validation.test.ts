import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import {
  validateCreateClientInput,
  validateListClientsFilters,
  validateUpdateClientInput,
  validateUpdateClientStatusInput,
} from './clients.validation';

describe('clients validation', () => {
  it('crear cliente solo con nombre', () => {
    expect(
      validateCreateClientInput({
        nombre_completo: '  Maria Perez  ',
      }),
    ).toEqual({
      nombreCompleto: 'Maria Perez',
      documento: null,
      telefono: null,
      telefonoSecundario: null,
      direccion: null,
      ciudad: null,
      correo: null,
      observaciones: null,
    });
  });

  it('crear cliente con nombre y telefono', () => {
    expect(
      validateCreateClientInput({
        nombre_completo: 'Maria Perez',
        telefono: ' 3001234567 ',
      }),
    ).toMatchObject({
      nombreCompleto: 'Maria Perez',
      telefono: '3001234567',
    });
  });

  it('crear cliente rechaza nombre vacio', () => {
    expect(() => validateCreateClientInput({ nombre_completo: ' ' })).toThrow(ApiError);
  });

  it('crear cliente convierte strings opcionales vacios a null', () => {
    expect(
      validateCreateClientInput({
        nombre_completo: 'Maria Perez',
        documento: '',
        telefono: '   ',
        correo: '',
      }),
    ).toMatchObject({
      documento: null,
      telefono: null,
      correo: null,
    });
  });

  it('crear cliente rechaza correo invalido', () => {
    expect(() =>
      validateCreateClientInput({
        nombre_completo: 'Maria Perez',
        correo: 'correo-invalido',
      }),
    ).toThrow(ApiError);
  });

  it('editar cliente rechaza payload vacio', () => {
    expect(() => validateUpdateClientInput({})).toThrow(ApiError);
  });

  it('editar cliente normaliza datos opcionales', () => {
    expect(
      validateUpdateClientInput({
        nombre_completo: '  Ana  ',
        correo: ' ANA@NORBE.TEST ',
        observaciones: '',
      }),
    ).toEqual({
      nombreCompleto: 'Ana',
      correo: 'ana@norbe.test',
      observaciones: null,
    });
  });

  it('valida estado de cliente', () => {
    expect(validateUpdateClientStatusInput({ estado: 'INACTIVO' })).toEqual({
      estado: 'INACTIVO',
    });
    expect(() => validateUpdateClientStatusInput({ estado: 'ELIMINADO' })).toThrow(ApiError);
  });

  it('listado aplica filtros basicos y limita paginacion', () => {
    const params = new URLSearchParams({
      buscar: 'maria',
      estado: 'ACTIVO',
      telefono: '3001234567',
      documento: '123',
      limit: '500',
      offset: '10',
    });

    expect(validateListClientsFilters(params)).toEqual({
      buscar: 'maria',
      estado: 'ACTIVO',
      telefono: '3001234567',
      documento: '123',
      limit: 100,
      offset: 10,
    });
  });
});
