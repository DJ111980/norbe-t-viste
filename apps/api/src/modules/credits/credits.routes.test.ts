import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleCreditRoutes } from './credits.routes';

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

vi.mock('./credits.service', () => ({
  listCredits: vi.fn(async () => []),
  getCreditById: vi.fn(async () => ({ idCredito: 'cre_1' })),
  listClientCredits: vi.fn(async () => []),
  cancelCredit: vi.fn(async () => ({
    id_credito: 'cre_1',
    estado_credito: 'ANULADO',
    saldo_anterior: 150000,
    saldo_nuevo: 0,
    monto_inicial: 150000,
    monto_abonado: 0,
  })),
  createOldDebt: vi.fn(async () => ({
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    origen_credito: 'DEUDA_ANTIGUA',
    tipo_deuda_antigua: 'SOLO_MONTO',
    monto_inicial: 150000,
    monto_abonado: 0,
    saldo_pendiente: 150000,
    estado_credito: 'PENDIENTE',
  })),
  createCreditPayment: vi.fn(async () => ({
    id_credito: 'cre_1',
    id_abono: 'abo_1',
    valor_abono: 50000,
    saldo_anterior: 150000,
    saldo_nuevo: 100000,
    estado_credito: 'PARCIAL',
  })),
  cancelCreditPayment: vi.fn(async () => ({
    id_credito: 'cre_1',
    id_abono: 'abo_1',
    estado_abono: 'ANULADO',
    valor_abono_anulado: 50000,
    saldo_anterior: 100000,
    saldo_nuevo: 150000,
    monto_abonado_anterior: 50000,
    monto_abonado_nuevo: 0,
    estado_credito: 'PENDIENTE',
  })),
  createCreditAdjustment: vi.fn(async () => ({
    id_credito: 'cre_1',
    id_ajuste: 'aju_1',
    tipo_ajuste: 'DESCUENTO',
    valor_ajuste: 10000,
    saldo_antes: 150000,
    saldo_despues: 140000,
    estado_credito: 'PENDIENTE',
  })),
}));

describe('credits routes', () => {
  it('ADMINISTRADOR puede listar creditos', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleCreditRoutes(
      new Request('http://localhost/creditos'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('VENDEDOR no puede listar todos los creditos', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleCreditRoutes(new Request('http://localhost/creditos'), {} as ApiEnv),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('ADMINISTRADOR y VENDEDOR pueden consultar credito por id', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (await handleCreditRoutes(new Request('http://localhost/creditos/cre_1'), {} as ApiEnv))
        ?.status,
    ).toBe(200);

    mocks.role = 'VENDEDOR';

    expect(
      (await handleCreditRoutes(new Request('http://localhost/creditos/cre_1'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
  });

  it('ADMINISTRADOR y VENDEDOR pueden consultar creditos de cliente', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleCreditRoutes(
          new Request('http://localhost/clientes/cli_1/creditos'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);

    mocks.role = 'VENDEDOR';

    expect(
      (
        await handleCreditRoutes(
          new Request('http://localhost/clientes/cli_1/creditos'),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('ADMINISTRADOR puede registrar deuda antigua', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleCreditRoutes(
      new Request('http://localhost/creditos/deuda-antigua', {
        method: 'POST',
        body: JSON.stringify({
          id_cliente: 'cli_1',
          monto_inicial: 150000,
          descripcion: 'Deuda vieja',
          tipo_deuda_antigua: 'SOLO_MONTO',
        }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(201);
  });

  it('VENDEDOR y usuario sin token no pueden registrar deuda antigua', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/deuda-antigua', {
          method: 'POST',
          body: JSON.stringify({
            id_cliente: 'cli_1',
            monto_inicial: 150000,
            descripcion: 'Deuda vieja',
            tipo_deuda_antigua: 'SOLO_MONTO',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    mocks.authenticated = false;

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/deuda-antigua', {
          method: 'POST',
          body: JSON.stringify({
            id_cliente: 'cli_1',
            monto_inicial: 150000,
            descripcion: 'Deuda vieja',
            tipo_deuda_antigua: 'SOLO_MONTO',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('solo ADMINISTRADOR puede anular creditos directamente', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleCreditRoutes(
      new Request('http://localhost/creditos/cre_1/anular', {
        method: 'POST',
        body: JSON.stringify({
          motivo_anulacion: 'Credito registrado por error',
        }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);

    mocks.role = 'VENDEDOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/anular', {
          method: 'POST',
          body: JSON.stringify({
            motivo_anulacion: 'Credito registrado por error',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('usuario sin token no puede anular creditos directamente', async () => {
    mocks.authenticated = false;
    mocks.role = 'ADMINISTRADOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/anular', {
          method: 'POST',
          body: JSON.stringify({
            motivo_anulacion: 'Credito registrado por error',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ADMINISTRADOR y VENDEDOR pueden registrar abonos a credito', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleCreditRoutes(
          new Request('http://localhost/creditos/cre_1/abonos', {
            method: 'POST',
            body: JSON.stringify({
              valor_abono: 50000,
              metodo_pago: 'EFECTIVO',
            }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);

    mocks.role = 'VENDEDOR';

    expect(
      (
        await handleCreditRoutes(
          new Request('http://localhost/creditos/cre_1/abonos', {
            method: 'POST',
            body: JSON.stringify({
              valor_abono: 50000,
              metodo_pago: 'NEQUI',
            }),
          }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);
  });

  it('usuario sin token no puede registrar abonos', async () => {
    mocks.authenticated = false;
    mocks.role = 'VENDEDOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/abonos', {
          method: 'POST',
          body: JSON.stringify({
            valor_abono: 50000,
            metodo_pago: 'EFECTIVO',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('solo ADMINISTRADOR puede anular abonos de credito', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleCreditRoutes(
      new Request('http://localhost/creditos/cre_1/abonos/abo_1/anular', {
        method: 'POST',
        body: JSON.stringify({
          motivo_anulacion: 'Abono registrado por error',
        }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);

    mocks.role = 'VENDEDOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/abonos/abo_1/anular', {
          method: 'POST',
          body: JSON.stringify({
            motivo_anulacion: 'Abono registrado por error',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('usuario sin token no puede anular abonos', async () => {
    mocks.authenticated = false;
    mocks.role = 'ADMINISTRADOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/abonos/abo_1/anular', {
          method: 'POST',
          body: JSON.stringify({
            motivo_anulacion: 'Abono registrado por error',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('solo ADMINISTRADOR puede registrar ajustes de credito', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleCreditRoutes(
      new Request('http://localhost/creditos/cre_1/ajustes', {
        method: 'POST',
        body: JSON.stringify({
          tipo_ajuste: 'DESCUENTO',
          valor_ajuste: 10000,
          motivo: 'Descuento autorizado',
        }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(201);

    mocks.role = 'VENDEDOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/ajustes', {
          method: 'POST',
          body: JSON.stringify({
            tipo_ajuste: 'DESCUENTO',
            valor_ajuste: 10000,
            motivo: 'Descuento autorizado',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('usuario sin token no puede registrar ajustes', async () => {
    mocks.authenticated = false;
    mocks.role = 'ADMINISTRADOR';

    await expect(
      handleCreditRoutes(
        new Request('http://localhost/creditos/cre_1/ajustes', {
          method: 'POST',
          body: JSON.stringify({
            tipo_ajuste: 'AUMENTO',
            valor_ajuste: 10000,
            motivo: 'Correccion',
          }),
        }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });
});
