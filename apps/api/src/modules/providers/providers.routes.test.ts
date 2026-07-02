import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleProviderRoutes } from './providers.routes';

const mocks = vi.hoisted(() => ({
  role: 'VENDEDOR' as 'ADMINISTRADOR' | 'VENDEDOR',
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: vi.fn(async () => ({
    user: {
      id_usuario: mocks.role === 'ADMINISTRADOR' ? 'usr_admin' : 'usr_vendedor',
      nombre_completo: mocks.role,
      correo: `${mocks.role.toLowerCase()}@norbe.test`,
      contrasena_hash: 'hash',
      rol: mocks.role,
      estado: 'ACTIVO',
    },
  })),
  requireRole: vi.fn((auth, allowedRoles) => {
    if (!allowedRoles.includes(auth.user.rol)) {
      throw new ApiError('FORBIDDEN', 'No tienes permisos para realizar esta accion.', 403);
    }
  }),
}));

vi.mock('./providers.service', () => ({
  listProviders: vi.fn(async () => []),
  getProvider: vi.fn(async () => ({ idProveedor: 'prv_1' })),
  createProvider: vi.fn(async () => ({ idProveedor: 'prv_1' })),
  updateProvider: vi.fn(async () => ({ idProveedor: 'prv_1' })),
  updateProviderStatus: vi.fn(async () => ({ idProveedor: 'prv_1', estado: 'INACTIVO' })),
}));

describe('providers routes', () => {
  it('vendedor puede listar proveedores', async () => {
    mocks.role = 'VENDEDOR';

    const response = await handleProviderRoutes(
      new Request('http://localhost/proveedores'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('vendedor puede consultar proveedor', async () => {
    mocks.role = 'VENDEDOR';

    const response = await handleProviderRoutes(
      new Request('http://localhost/proveedores/prv_1'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('vendedor no puede crear proveedor', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleProviderRoutes(
        new Request('http://localhost/proveedores', {
          method: 'POST',
          body: JSON.stringify({ nombre_proveedor: 'Moda Cali' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('vendedor no puede editar proveedor', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleProviderRoutes(
        new Request('http://localhost/proveedores/prv_1', {
          method: 'PATCH',
          body: JSON.stringify({ telefono_principal: '3001234567' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('vendedor no puede cambiar estado', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleProviderRoutes(
        new Request('http://localhost/proveedores/prv_1/estado', {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'INACTIVO' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('administrador puede cambiar estado', async () => {
    mocks.role = 'ADMINISTRADOR';

    const response = await handleProviderRoutes(
      new Request('http://localhost/proveedores/prv_1/estado', {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'INACTIVO' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });
});
