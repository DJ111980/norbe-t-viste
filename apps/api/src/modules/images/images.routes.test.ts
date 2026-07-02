import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleImageRoutes } from './images.routes';

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

vi.mock('./images.validation', () => ({
  validateImageUploadRequest: vi.fn(async () => ({
    file: new File(['img'], 'foto.png', { type: 'image/png' }),
    extension: 'png',
    contentType: 'image/png',
    size: 3,
  })),
}));

vi.mock('./images.service', () => ({
  getProductImage: vi.fn(async () => ({
    id_producto: 'prd_1',
    imagen: { key: 'productos/prd_1/principal/a.png', origen: 'PRODUCTO' },
  })),
  getProductImageFile: vi.fn(async () => new Response('producto', { status: 200 })),
  uploadProductImage: vi.fn(async () => ({
    id_producto: 'prd_1',
    imagen: { key: 'productos/prd_1/principal/a.png', origen: 'PRODUCTO' },
  })),
  deleteProductImage: vi.fn(async () => ({
    id_producto: 'prd_1',
    imagen: null,
  })),
  getVariantImage: vi.fn(async () => ({
    id_variante: 'var_1',
    imagen: { key: 'productos/prd_1/principal/a.png', origen: 'PRODUCTO' },
    origen: 'PRODUCTO',
  })),
  getVariantImageFile: vi.fn(async () => new Response('variante', { status: 200 })),
  uploadVariantImage: vi.fn(async () => ({
    id_variante: 'var_1',
    imagen: { key: 'variantes/var_1/a.png', origen: 'VARIANTE' },
    origen: 'VARIANTE',
  })),
  deleteVariantImage: vi.fn(async () => ({
    id_variante: 'var_1',
    imagen: null,
    origen: 'NINGUNA',
  })),
}));

describe('images routes', () => {
  it('VENDEDOR puede consultar metadata y archivo de producto', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/productos/prd_1/imagen'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/productos/prd_1/imagen/file'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('VENDEDOR puede consultar metadata y archivo de variante', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/variantes/var_1/imagen'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/variantes/var_1/imagen/file'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('VENDEDOR no puede subir ni eliminar imagen de producto', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleImageRoutes(
        new Request('http://localhost/productos/prd_1/imagen', { method: 'POST' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleImageRoutes(
        new Request('http://localhost/productos/prd_1/imagen', { method: 'DELETE' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('VENDEDOR no puede subir ni eliminar imagen de variante', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleImageRoutes(
        new Request('http://localhost/variantes/var_1/imagen', { method: 'POST' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleImageRoutes(
        new Request('http://localhost/variantes/var_1/imagen', { method: 'DELETE' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('ADMINISTRADOR puede administrar imagen de producto', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/productos/prd_1/imagen', { method: 'POST' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);
    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/productos/prd_1/imagen', { method: 'DELETE' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('ADMINISTRADOR puede administrar imagen de variante', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/variantes/var_1/imagen', { method: 'POST' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);
    expect(
      (
        await handleImageRoutes(
          new Request('http://localhost/variantes/var_1/imagen', { method: 'DELETE' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });
});
