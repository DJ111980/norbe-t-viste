import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handlePortfolioRoutes } from './portfolio.routes';

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
        rol: mocks.role,
      },
    };
  }),
  requireRole: vi.fn((auth, allowedRoles) => {
    if (!allowedRoles.includes(auth.user.rol)) {
      throw new ApiError('FORBIDDEN', 'No tienes permisos para realizar esta accion.', 403);
    }
  }),
}));

vi.mock('./portfolio.service', () => ({
  getPortfolio: vi.fn(async () => ({
    resumen: { totalCreditos: 0, totalSaldoPendiente: 0 },
    creditos: [],
  })),
  getClientPortfolio: vi.fn(async () => ({
    cliente: { idCliente: 'cli_1' },
    resumen: { totalCreditos: 0, totalSaldoPendiente: 0 },
    creditosActivos: [],
    creditosPagados: [],
    creditosAnulados: [],
  })),
}));

describe('portfolio routes', () => {
  it('ADMINISTRADOR puede consultar cartera general', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handlePortfolioRoutes(
      new Request('http://localhost/cartera'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('VENDEDOR no puede consultar cartera general', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handlePortfolioRoutes(new Request('http://localhost/cartera'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('sin token no puede consultar cartera', async () => {
    mocks.authenticated = false;

    await expect(
      handlePortfolioRoutes(new Request('http://localhost/cartera'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ADMINISTRADOR y VENDEDOR pueden consultar cartera de cliente', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handlePortfolioRoutes(
          new Request('http://localhost/clientes/cli_1/cartera'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);

    mocks.role = 'VENDEDOR';

    expect(
      (
        await handlePortfolioRoutes(
          new Request('http://localhost/clientes/cli_1/cartera'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('ignora rutas que no son de cartera', async () => {
    const response = await handlePortfolioRoutes(
      new Request('http://localhost/clientes/cli_1'),
      {} as ApiEnv,
    );

    expect(response).toBeNull();
  });
});
