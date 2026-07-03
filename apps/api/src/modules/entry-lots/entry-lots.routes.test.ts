import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleEntryLotRoutes } from './entry-lots.routes';

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

vi.mock('./entry-lots.service', () => ({
  listEntryLots: vi.fn(async () => []),
  getEntryLot: vi.fn(async () => ({ idLote: 'lot_1', detalles: [] })),
  createEntryLot: vi.fn(async () => ({ idLote: 'lot_1', estadoLote: 'BORRADOR' })),
  updateEntryLot: vi.fn(async () => ({ idLote: 'lot_1', estadoLote: 'BORRADOR' })),
  confirmEntryLot: vi.fn(async () => ({
    id_lote: 'lot_1',
    estado_lote: 'CONFIRMADO',
    detalles_procesados: 1,
    movimientos_creados: 1,
    total_unidades_ingresadas: 2,
  })),
  cancelEntryLot: vi.fn(async () => ({
    id_lote: 'lot_1',
    estado_lote: 'ANULADO',
    detalles_procesados: 1,
    movimientos_creados: 1,
    total_unidades_reversadas: 2,
  })),
  createEntryLotDetail: vi.fn(async () => ({ idDetalleLote: 'det_1' })),
  updateEntryLotDetail: vi.fn(async () => ({ idDetalleLote: 'det_1' })),
  deleteEntryLotDetail: vi.fn(async () => ({ idDetalleLote: 'det_1', eliminado: true })),
}));

describe('entry lots routes', () => {
  it('VENDEDOR puede listar y consultar lotes', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    expect(
      (await handleEntryLotRoutes(new Request('http://localhost/lotes-entrada'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
    expect(
      (
        await handleEntryLotRoutes(
          new Request('http://localhost/lotes-entrada/lot_1'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('VENDEDOR no puede crear, editar ni modificar detalles', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleEntryLotRoutes(
        new Request('http://localhost/lotes-entrada', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleEntryLotRoutes(
        new Request('http://localhost/lotes-entrada/lot_1', {
          method: 'PATCH',
          body: JSON.stringify({ observaciones: 'x' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleEntryLotRoutes(
        new Request('http://localhost/lotes-entrada/lot_1/detalles', {
          method: 'POST',
          body: JSON.stringify({ id_variante: 'var_1', cantidad: 1, costo_unitario: 1 }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('ADMINISTRADOR puede crear y editar lote', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleEntryLotRoutes(
          new Request('http://localhost/lotes-entrada', {
            method: 'POST',
            body: JSON.stringify({}),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);

    expect(
      (
        await handleEntryLotRoutes(
          new Request('http://localhost/lotes-entrada/lot_1', {
            method: 'PATCH',
            body: JSON.stringify({ observaciones: 'x' }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('ADMINISTRADOR puede crear, editar y eliminar detalles', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleEntryLotRoutes(
          new Request('http://localhost/lotes-entrada/lot_1/detalles', {
            method: 'POST',
            body: JSON.stringify({ id_variante: 'var_1', cantidad: 1, costo_unitario: 1 }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);

    expect(
      (
        await handleEntryLotRoutes(
          new Request('http://localhost/lotes-entrada/lot_1/detalles/det_1', {
            method: 'PATCH',
            body: JSON.stringify({ cantidad: 2 }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);

    expect(
      (
        await handleEntryLotRoutes(
          new Request('http://localhost/lotes-entrada/lot_1/detalles/det_1', {
            method: 'DELETE',
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('ADMINISTRADOR puede confirmar lote', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleEntryLotRoutes(
      new Request('http://localhost/lotes-entrada/lot_1/confirmar', { method: 'POST' }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('ADMINISTRADOR puede anular lote', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleEntryLotRoutes(
      new Request('http://localhost/lotes-entrada/lot_1/anular', {
        method: 'POST',
        body: JSON.stringify({ motivo: 'Error al registrar el lote' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({
      ok: true,
      data: { anulacion: { estado_lote: 'ANULADO' } },
    });
  });

  it('VENDEDOR no puede anular lote', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleEntryLotRoutes(
        new Request('http://localhost/lotes-entrada/lot_1/anular', {
          method: 'POST',
          body: JSON.stringify({ motivo: 'Error' }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('VENDEDOR y usuario sin token no pueden confirmar lote', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleEntryLotRoutes(
        new Request('http://localhost/lotes-entrada/lot_1/confirmar', { method: 'POST' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    mocks.authenticated = false;

    await expect(
      handleEntryLotRoutes(
        new Request('http://localhost/lotes-entrada/lot_1/confirmar', { method: 'POST' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });
});
