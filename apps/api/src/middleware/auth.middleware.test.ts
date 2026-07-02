import { describe, expect, it } from 'vitest';
import { ApiError } from '../shared/errors';
import type { AuthContext } from './auth.middleware';
import { requireRole } from './auth.middleware';

const auth = {
  user: {
    id_usuario: 'usr_1',
    nombre_completo: 'Administrador',
    correo: 'admin@norbe.test',
    contrasena_hash: 'hash',
    rol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
  },
} satisfies AuthContext;

describe('auth middleware roles', () => {
  it('permite un rol autorizado', () => {
    expect(() => requireRole(auth, ['ADMINISTRADOR'])).not.toThrow();
  });

  it('rechaza un rol no autorizado', () => {
    expect(() => requireRole(auth, ['VENDEDOR'])).toThrow(ApiError);
  });
});
