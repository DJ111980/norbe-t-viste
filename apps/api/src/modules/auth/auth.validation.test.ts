import { describe, expect, it } from 'vitest';
import { validateLoginInput } from './auth.validation';

describe('auth validation', () => {
  it('normaliza el correo a minusculas', () => {
    expect(
      validateLoginInput({
        correo: ' ADMIN@NORBE.TEST ',
        contrasena: 'Clave segura 123',
      }),
    ).toEqual({
      correo: 'admin@norbe.test',
      contrasena: 'Clave segura 123',
    });
  });
});
