import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleInventoryRoutes } from './inventory.routes';

const mocks = vi.hoisted(() => ({
  role: 'VENDEDOR' as 'ADMINISTRADOR' | 'VENDEDOR',
  authenticated: true,
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: vi.fn(async () => {
    if (!mocks.authenticated) {
      throw new ApiError('AUTH_REQUIRED', 'Debes iniciar sesion para acceder a esta ruta.', 401);
    }

    return {
      user: {
        id_usuario: mocks.role === 'ADMINISTRADOR' ? 'usr_admin' : 'usr_vendedor',
        nombre_completo: mocks.role,
        correo: `${mocks.role.toLowerCase()}@norbe.test`,
        contrasena_hash: 'hash',
        rol: mocks.role,
        estado: 'ACTIVO',
      },
    };
  }),
  requireRole: vi.fn((auth, allowedRoles) => {
    if (!allowedRoles.includes(auth.user.rol)) {
      throw new ApiError('FORBIDDEN', 'No tienes permisos para realizar esta accion.', 403);
    }
  }),
}));

vi.mock('./inventory.service', () => ({
  listInventoryVariants: vi.fn(async () => []),
  getInventoryVariant: vi.fn(async () => ({ idVariante: 'var_1' })),
  listInventoryMovements: vi.fn(async () => []),
}));

describe('inventory routes', () => {
  it('VENDEDOR puede listar y consultar variantes de inventario', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    expect(
      (
        await handleInventoryRoutes(
          new Request('http://localhost/inventario/variantes'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await handleInventoryRoutes(
          new Request('http://localhost/inventario/variantes/var_1'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('VENDEDOR no puede consultar movimientos', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleInventoryRoutes(
        new Request('http://localhost/inventario/variantes/var_1/movimientos'),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleInventoryRoutes(new Request('http://localhost/inventario/movimientos'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('ADMINISTRADOR puede consultar movimientos', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleInventoryRoutes(
          new Request('http://localhost/inventario/variantes/var_1/movimientos'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await handleInventoryRoutes(
          new Request('http://localhost/inventario/movimientos'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('sin token no puede consultar inventario', async () => {
    mocks.authenticated = false;

    await expect(
      handleInventoryRoutes(new Request('http://localhost/inventario/variantes'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });
});
