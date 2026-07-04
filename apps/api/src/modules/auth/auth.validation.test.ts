import { describe, expect, it } from 'vitest';
import { validateLoginInput } from './auth.validation';

describe('auth validation', () => {
  it('normaliza usuario y mantiene compatibilidad temporal con correo', () => {
    expect(
      validateLoginInput({
        correo: ' ADMIN@NORBE.TEST ',
        contrasena: 'Clave segura 123',
      }),
    ).toEqual({
      usuario: 'admin@norbe.test',
      contrasena: 'Clave segura 123',
    });
  });
});
