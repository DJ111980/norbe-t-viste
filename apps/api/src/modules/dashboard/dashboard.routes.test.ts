import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleDashboardRoutes } from './dashboard.routes';

const mocks = vi.hoisted(() => ({
  role: 'ADMINISTRADOR' as 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGA',
  authenticated: true,
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: vi.fn(async () => {
    if (!mocks.authenticated) {
      throw new ApiError('AUTH_REQUIRED', 'Debes iniciar sesion para acceder a esta ruta.', 401);
    }

    return {
      user: {
        id_usuario: 'usr_1',
        nombre_completo: 'Usuario',
        correo: 'usuario@norbe.test',
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

vi.mock('./dashboard.service', () => ({
  getDashboardSummary: vi.fn(async () => ({
    periodo: {
      fechaDesde: '2026-07-03T00:00:00.000Z',
      fechaHasta: '2026-07-03T23:59:59.999Z',
    },
    ventas: { cantidad_total: 0 },
  })),
}));

describe('dashboard routes', () => {
  it('ADMINISTRADOR puede consultar resumen', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleDashboardRoutes(
      new Request('http://localhost/dashboard/resumen'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({ ok: true, data: { resumen: {} } });
  });

  it('VENDEDOR puede consultar resumen', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    const response = await handleDashboardRoutes(
      new Request('http://localhost/dashboard/resumen'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('sin token falla', async () => {
    mocks.authenticated = false;

    await expect(
      handleDashboardRoutes(new Request('http://localhost/dashboard/resumen'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('rol no permitido falla', async () => {
    mocks.authenticated = true;
    mocks.role = 'BODEGA';

    await expect(
      handleDashboardRoutes(new Request('http://localhost/dashboard/resumen'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });
});
