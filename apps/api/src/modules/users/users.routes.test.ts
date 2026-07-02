import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { handleUserRoutes } from './users.routes';

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: vi.fn(async () => ({
    user: {
      id_usuario: 'usr_vendedor',
      nombre_completo: 'Vendedor',
      correo: 'vendedor@norbe.test',
      contrasena_hash: 'hash',
      rol: 'VENDEDOR',
      estado: 'ACTIVO',
    },
  })),
  requireRole: vi.fn(() => {
    throw new Error('No tienes permisos para realizar esta accion.');
  }),
}));

describe('users routes', () => {
  it('VENDEDOR no puede acceder a endpoints de usuarios', async () => {
    await expect(
      handleUserRoutes(new Request('http://localhost/usuarios'), {} as ApiEnv),
    ).rejects.toThrow('No tienes permisos');
  });
});
