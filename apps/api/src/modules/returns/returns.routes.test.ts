import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleReturnRoutes } from './returns.routes';

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

vi.mock('./returns.service', () => ({
  createSaleReturn: vi.fn(async () => ({
    id_devolucion: 'dev_1',
    id_venta: 'ven_1',
    tipo_venta: 'CONTADO',
    estado_devolucion: 'ACTIVA',
    total_devuelto: 50000,
    impacto_credito: 0,
    impacto_pago: 50000,
    items_devueltos: 1,
    movimientos_creados: 1,
  })),
  listSaleReturns: vi.fn(async () => []),
}));

describe('returns routes', () => {
  it('ADMINISTRADOR puede crear devolucion de venta', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleReturnRoutes(
      new Request('http://localhost/ventas/ven_1/devoluciones', {
        method: 'POST',
        body: JSON.stringify({
          motivo: 'Cliente devuelve una prenda',
          detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 1 }],
        }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(201);
  });

  it('VENDEDOR y usuario sin token no pueden crear devolucion', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleReturnRoutes(
        new Request('http://localhost/ventas/ven_1/devoluciones', {
          method: 'POST',
          body: JSON.stringify({
            motivo: 'Cliente devuelve una prenda',
            detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 1 }],
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    mocks.authenticated = false;

    await expect(
      handleReturnRoutes(new Request('http://localhost/ventas/ven_1/devoluciones'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ADMINISTRADOR y VENDEDOR pueden consultar devoluciones', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleReturnRoutes(
          new Request('http://localhost/ventas/ven_1/devoluciones'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);

    mocks.role = 'VENDEDOR';

    expect(
      (
        await handleReturnRoutes(
          new Request('http://localhost/ventas/ven_1/devoluciones'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('ignora rutas que no son de devoluciones', async () => {
    await expect(
      handleReturnRoutes(new Request('http://localhost/ventas/ven_1'), {} as ApiEnv),
    ).resolves.toBeNull();
  });
});
