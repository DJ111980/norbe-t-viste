import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import {
  validateCreateUserInput,
  validateResetUserPasswordInput,
  validateUpdateUserInput,
} from './users.validation';

describe('users validation', () => {
  it('crear usuario normaliza correo', () => {
    expect(
      validateCreateUserInput({
        nombre_completo: 'Vendedor Principal',
        nombre_usuario: ' VENDEDOR_1 ',
        correo: ' VENDEDOR@NORBE.TEST ',
        rol: 'VENDEDOR',
        contrasena: 'clave123',
      }),
    ).toEqual({
      nombreCompleto: 'Vendedor Principal',
      nombreUsuario: 'vendedor_1',
      correo: 'vendedor@norbe.test',
      rol: 'VENDEDOR',
      contrasena: 'clave123',
    });
  });

  it('crear usuario rechaza rol invalido', () => {
    expect(() =>
      validateCreateUserInput({
        nombre_completo: 'Usuario',
        nombre_usuario: 'usuario',
        correo: 'usuario@norbe.test',
        rol: 'CAJERO',
        contrasena: 'clave123',
      }),
    ).toThrow(ApiError);
  });

  it('crear usuario rechaza contrasena debil', () => {
    expect(() =>
      validateCreateUserInput({
        nombre_completo: 'Usuario',
        nombre_usuario: 'usuario',
        correo: 'usuario@norbe.test',
        rol: 'VENDEDOR',
        contrasena: 'abc',
      }),
    ).toThrow(ApiError);
  });

  it('editar usuario normaliza correo', () => {
    expect(
      validateUpdateUserInput({
        correo: ' NUEVO@NORBE.TEST ',
      }),
    ).toEqual({
      correo: 'nuevo@norbe.test',
    });
  });

  it('editar usuario normaliza nombre de usuario', () => {
    expect(
      validateUpdateUserInput({
        nombre_usuario: ' Nuevo-Usuario ',
      }),
    ).toEqual({
      nombreUsuario: 'nuevo-usuario',
    });
  });

  it('editar usuario rechaza payload vacio', () => {
    expect(() => validateUpdateUserInput({})).toThrow(ApiError);
  });

  it('validar reset de contrasena aplica politica minima', () => {
    expect(() => validateResetUserPasswordInput({ nueva_contrasena: 'abc' })).toThrow(ApiError);
    expect(validateResetUserPasswordInput({ nueva_contrasena: 'clave123' })).toEqual({
      nuevaContrasena: 'clave123',
    });
  });
});
