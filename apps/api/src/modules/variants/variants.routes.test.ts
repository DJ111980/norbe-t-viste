import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleVariantRoutes } from './variants.routes';

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

vi.mock('./variants.service', () => ({
  listVariants: vi.fn(async () => []),
  getVariant: vi.fn(async () => ({ idVariante: 'var_1' })),
  getVariantByQr: vi.fn(async () => ({ idVariante: 'var_1', codigoQr: 'NTV-VAR-000001' })),
  createVariant: vi.fn(async () => ({ idVariante: 'var_1' })),
  updateVariant: vi.fn(async () => ({ idVariante: 'var_1' })),
  updateVariantStatus: vi.fn(async () => ({ idVariante: 'var_1', estado: 'INACTIVA' })),
}));

describe('variants routes', () => {
  it('vendedor puede listar, consultar y consultar por QR', async () => {
    mocks.role = 'VENDEDOR';

    expect(
      (await handleVariantRoutes(new Request('http://localhost/variantes'), {} as ApiEnv))?.status,
    ).toBe(200);
    expect(
      (await handleVariantRoutes(new Request('http://localhost/variantes/var_1'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
    expect(
      (
        await handleVariantRoutes(
          new Request('http://localhost/variantes/qr/NTV-VAR-000001'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await handleVariantRoutes(
          new Request('http://localhost/productos/prd_1/variantes'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('vendedor no puede crear, editar ni cambiar estado', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleVariantRoutes(
        new Request('http://localhost/productos/prd_1/variantes', {
          method: 'POST',
          body: JSON.stringify({ talla: 'M', color: 'Rojo' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleVariantRoutes(
        new Request('http://localhost/variantes/var_1', {
          method: 'PATCH',
          body: JSON.stringify({ talla: 'L' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleVariantRoutes(
        new Request('http://localhost/variantes/var_1/estado', {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'INACTIVA' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('administrador puede crear y cambiar estado', async () => {
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleVariantRoutes(
          new Request('http://localhost/productos/prd_1/variantes', {
            method: 'POST',
            body: JSON.stringify({ talla: 'M', color: 'Rojo' }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);
    expect(
      (
        await handleVariantRoutes(
          new Request('http://localhost/variantes/var_1/estado', {
            method: 'PATCH',
            body: JSON.stringify({ estado: 'INACTIVA' }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });
});
