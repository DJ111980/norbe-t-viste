import { describe, expect, it } from 'vitest';
import { buildLoginPayload, loginFieldLabels } from './LoginPage';

describe('LoginPage helpers', () => {
  it('usa Usuario como campo visible y no Correo', () => {
    expect(loginFieldLabels()).toEqual({
      user: 'Usuario',
      password: 'Contraseña',
    });
  });

  it('envia usuario al backend', () => {
    expect(buildLoginPayload(' admin ', 'admin123')).toEqual({
      usuario: 'admin',
      contrasena: 'admin123',
    });
  });
});
