import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleSaleRoutes } from './sales.routes';

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

vi.mock('./sales.service', () => ({
  cancelCashSale: vi.fn(async () => ({
    id_venta: 'ven_1',
    estado_venta: 'ANULADA',
    items_revertidos: 1,
    movimientos_creados: 1,
    pagos_anulados: 1,
    total_unidades_devuelto: 1,
  })),
  listSales: vi.fn(async () => []),
  getSaleById: vi.fn(async () => ({
    idVenta: 'ven_1',
    numeroVenta: 'VTA-20260702-ABC',
    tipoVenta: 'CONTADO',
    estadoVenta: 'COMPLETADA',
    total: 50000,
    saldoPendiente: 0,
    cliente: null,
    vendedor: {
      idUsuario: 'usr_admin',
      nombreCompleto: 'Admin',
      correo: 'admin@norbe.test',
    },
    creadoEn: '2026-07-02',
    cantidadItems: 1,
    subtotal: 50000,
    descuento: 0,
    valorPagadoInicial: 50000,
    observaciones: null,
    actualizadoEn: '2026-07-02',
    detalles: [],
    pagos: [],
    resumen: {
      subtotal: 50000,
      descuento: 0,
      total: 50000,
      saldoPendiente: 0,
      cantidadItems: 1,
      pagosRegistrados: 0,
    },
  })),
  listSalePayments: vi.fn(async () => []),
  createCashSale: vi.fn(async () => ({
    id_venta: 'ven_1',
    numero_venta: 'VTA-20260702-ABC',
    tipo_venta: 'CONTADO',
    estado_venta: 'COMPLETADA',
    total: 50000,
    saldo_pendiente: 0,
    items_vendidos: 1,
    movimientos_creados: 1,
    pago: {
      metodo_pago: 'EFECTIVO',
      valor_pagado: 50000,
    },
  })),
}));

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/ventas', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('sales routes', () => {
  it('ADMINISTRADOR puede crear venta de contado', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleSaleRoutes(
      buildRequest({
        tipo_venta: 'CONTADO',
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(201);
  });

  it('VENDEDOR puede crear venta de contado', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    const response = await handleSaleRoutes(
      buildRequest({
        tipo_venta: 'CONTADO',
        metodo_pago: 'EFECTIVO',
        detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(201);
  });

  it('sin token no puede crear venta', async () => {
    mocks.authenticated = false;

    await expect(
      handleSaleRoutes(
        buildRequest({
          tipo_venta: 'CONTADO',
          metodo_pago: 'EFECTIVO',
          detalles: [{ id_variante: 'var_1', cantidad: 1 }],
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ADMINISTRADOR y VENDEDOR pueden listar ventas', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (await handleSaleRoutes(new Request('http://localhost/ventas'), {} as ApiEnv))?.status,
    ).toBe(200);

    mocks.role = 'VENDEDOR';

    expect(
      (await handleSaleRoutes(new Request('http://localhost/ventas'), {} as ApiEnv))?.status,
    ).toBe(200);
  });

  it('sin token no puede listar ventas', async () => {
    mocks.authenticated = false;

    await expect(
      handleSaleRoutes(new Request('http://localhost/ventas'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ADMINISTRADOR y VENDEDOR pueden consultar una venta y pagos', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (await handleSaleRoutes(new Request('http://localhost/ventas/ven_1'), {} as ApiEnv))?.status,
    ).toBe(200);
    expect(
      (await handleSaleRoutes(new Request('http://localhost/ventas/ven_1/pagos'), {} as ApiEnv))
        ?.status,
    ).toBe(200);

    mocks.role = 'VENDEDOR';

    expect(
      (await handleSaleRoutes(new Request('http://localhost/ventas/ven_1'), {} as ApiEnv))?.status,
    ).toBe(200);
  });

  it('ADMINISTRADOR puede anular venta', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleSaleRoutes(
      new Request('http://localhost/ventas/ven_1/anular', {
        method: 'POST',
        body: JSON.stringify({ motivo_anulacion: 'Cliente cancelo la compra' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('VENDEDOR no puede anular venta', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleSaleRoutes(
        new Request('http://localhost/ventas/ven_1/anular', {
          method: 'POST',
          body: JSON.stringify({ motivo_anulacion: 'Cliente cancelo la compra' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('sin token no puede anular venta', async () => {
    mocks.authenticated = false;

    await expect(
      handleSaleRoutes(
        new Request('http://localhost/ventas/ven_1/anular', {
          method: 'POST',
          body: JSON.stringify({ motivo_anulacion: 'Cliente cancelo la compra' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ignora rutas que no son ventas', async () => {
    const response = await handleSaleRoutes(new Request('http://localhost/clientes'), {} as ApiEnv);

    expect(response).toBeNull();
  });
});
