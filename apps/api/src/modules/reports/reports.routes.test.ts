import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleReportRoutes } from './reports.routes';

const mocks = vi.hoisted(() => ({
  role: 'ADMINISTRADOR' as 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGA',
  authenticated: true,
  called: '',
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

function report(name: string) {
  return async () => {
    mocks.called = name;
    return {
      items: [],
      totales: {},
      paginacion: { page: 1, page_size: 50, total_items: 0, total_pages: 0 },
    };
  };
}

vi.mock('./reports.service', () => ({
  getSalesReport: vi.fn(report('ventas')),
  getInventoryReport: vi.fn(report('inventario')),
  getInventoryMovementReport: vi.fn(report('movimientos')),
  getPortfolioReport: vi.fn(report('cartera')),
  getReturnsReport: vi.fn(report('devoluciones')),
  getEntryLotsReport: vi.fn(report('lotes')),
}));

describe('reports routes', () => {
  it('ADMINISTRADOR accede a todos los reportes JSON', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    for (const path of [
      '/reportes/ventas',
      '/reportes/inventario',
      '/reportes/movimientos-inventario',
      '/reportes/cartera',
      '/reportes/devoluciones',
      '/reportes/lotes-entrada',
    ]) {
      const response = await handleReportRoutes(
        new Request(`http://localhost${path}`),
        {} as ApiEnv,
      );
      expect(response?.status).toBe(200);
      expect(await response?.json()).toMatchObject({ ok: true, data: { reporte: {} } });
    }
  });

  it('VENDEDOR solo accede a ventas e inventario', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    expect(
      (await handleReportRoutes(new Request('http://localhost/reportes/ventas'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
    expect(
      (await handleReportRoutes(new Request('http://localhost/reportes/inventario'), {} as ApiEnv))
        ?.status,
    ).toBe(200);

    await expect(
      handleReportRoutes(new Request('http://localhost/reportes/cartera'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('sin token falla', async () => {
    mocks.authenticated = false;

    await expect(
      handleReportRoutes(new Request('http://localhost/reportes/ventas'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('valida page_size maximo', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    await expect(
      handleReportRoutes(
        new Request('http://localhost/reportes/ventas?page_size=101'),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PAGE_SIZE' });
  });
});
