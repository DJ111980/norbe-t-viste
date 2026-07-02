import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleClientRoutes } from './clients.routes';

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

vi.mock('./clients.service', () => ({
  listClients: vi.fn(async () => []),
  getClient: vi.fn(async () => ({ idCliente: 'cli_1' })),
  createClient: vi.fn(async () => ({ idCliente: 'cli_1' })),
  updateClient: vi.fn(async () => ({ idCliente: 'cli_1' })),
  updateClientStatus: vi.fn(async () => ({ idCliente: 'cli_1', estado: 'INACTIVO' })),
}));

describe('clients routes', () => {
  it('vendedor puede crear cliente', async () => {
    mocks.role = 'VENDEDOR';

    const response = await handleClientRoutes(
      new Request('http://localhost/clientes', {
        method: 'POST',
        body: JSON.stringify({ nombre_completo: 'Maria Perez' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(201);
  });

  it('vendedor puede editar cliente', async () => {
    mocks.role = 'VENDEDOR';

    const response = await handleClientRoutes(
      new Request('http://localhost/clientes/cli_1', {
        method: 'PATCH',
        body: JSON.stringify({ telefono: '3001234567' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('vendedor no puede cambiar estado', async () => {
    mocks.role = 'VENDEDOR';

    await expect(
      handleClientRoutes(
        new Request('http://localhost/clientes/cli_1/estado', {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'INACTIVO' }),
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

    const response = await handleClientRoutes(
      new Request('http://localhost/clientes/cli_1/estado', {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'INACTIVO' }),
      }),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });
});
