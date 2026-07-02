import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleProductRoutes } from './products.routes';

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

vi.mock('./products.service', () => ({
  listProducts: vi.fn(async () => []),
  getProduct: vi.fn(async () => ({ idProducto: 'prd_1' })),
  createProduct: vi.fn(async () => ({ idProducto: 'prd_1', estado: 'ACTIVO' })),
  updateProduct: vi.fn(async () => ({ idProducto: 'prd_1' })),
  updateProductStatus: vi.fn(async () => ({ idProducto: 'prd_1', estado: 'INACTIVO' })),
}));

describe('products routes', () => {
  it('vendedor puede listar y consultar productos', async () => {
    mocks.role = 'VENDEDOR';

    expect(
      (await handleProductRoutes(new Request('http://localhost/productos'), {} as ApiEnv))?.status,
    ).toBe(200);
    expect(
      (await handleProductRoutes(new Request('http://localhost/productos/prd_1'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
  });

  it('vendedor no puede crear, editar ni cambiar estado', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleProductRoutes(
        new Request('http://localhost/productos', {
          method: 'POST',
          body: JSON.stringify({ nombre_producto: 'Blusa', id_categoria: 'cat_1' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleProductRoutes(
        new Request('http://localhost/productos/prd_1', {
          method: 'PATCH',
          body: JSON.stringify({ marca: 'Marca' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleProductRoutes(
        new Request('http://localhost/productos/prd_1/estado', {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'INACTIVO' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('administrador puede cambiar estado', async () => {
    mocks.role = 'ADMINISTRADOR';

    const response = await handleProductRoutes(
      new Request('http://localhost/productos/prd_1/estado', {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'INACTIVO' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });
});
