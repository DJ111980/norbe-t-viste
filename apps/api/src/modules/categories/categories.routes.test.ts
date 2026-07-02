import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleCategoryRoutes } from './categories.routes';

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

vi.mock('./categories.service', () => ({
  listCategories: vi.fn(async () => []),
  getCategory: vi.fn(async () => ({ idCategoria: 'cat_1' })),
  createCategory: vi.fn(async () => ({ idCategoria: 'cat_1', estado: 'ACTIVA' })),
  updateCategory: vi.fn(async () => ({ idCategoria: 'cat_1' })),
  updateCategoryStatus: vi.fn(async () => ({ idCategoria: 'cat_1', estado: 'INACTIVA' })),
}));

describe('categories routes', () => {
  it('vendedor puede listar categorias', async () => {
    mocks.role = 'VENDEDOR';

    const response = await handleCategoryRoutes(
      new Request('http://localhost/categorias'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('vendedor puede consultar categoria', async () => {
    mocks.role = 'VENDEDOR';

    const response = await handleCategoryRoutes(
      new Request('http://localhost/categorias/cat_1'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('vendedor no puede crear categoria', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleCategoryRoutes(
        new Request('http://localhost/categorias', {
          method: 'POST',
          body: JSON.stringify({ nombre_categoria: 'Blusas' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('vendedor no puede editar categoria', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleCategoryRoutes(
        new Request('http://localhost/categorias/cat_1', {
          method: 'PATCH',
          body: JSON.stringify({ descripcion: 'Nueva descripcion' }),
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
      handleCategoryRoutes(
        new Request('http://localhost/categorias/cat_1/estado', {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'INACTIVA' }),
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

    const response = await handleCategoryRoutes(
      new Request('http://localhost/categorias/cat_1/estado', {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'INACTIVA' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });
});
