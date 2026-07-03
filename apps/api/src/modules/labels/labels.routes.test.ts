import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleLabelRoutes } from './labels.routes';

const mocks = vi.hoisted(() => ({
  role: 'VENDEDOR' as 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGA',
  authenticated: true,
  requestedVariant: '',
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

vi.mock('./labels.service', () => ({
  getVariantLabelPreviewHtml: vi.fn(async (_env: ApiEnv, idVariante: string) => {
    mocks.requestedVariant = idVariante;
    return '<!doctype html><html><body>NTV-VAR-000001</body></html>';
  }),
}));

describe('labels routes', () => {
  it('ADMINISTRADOR puede obtener preview HTML', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    const response = await handleLabelRoutes(
      new Request('http://localhost/etiquetas/variantes/var_1/preview'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await response?.text()).toContain('<!doctype html>');
    expect(mocks.requestedVariant).toBe('var_1');
  });

  it('VENDEDOR puede obtener preview HTML', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    const response = await handleLabelRoutes(
      new Request('http://localhost/etiquetas/variantes/var_1/preview'),
      {} as ApiEnv,
    );

    expect(response?.status).toBe(200);
  });

  it('rechaza usuarios sin autenticacion', async () => {
    mocks.authenticated = false;
    mocks.role = 'VENDEDOR';

    await expect(
      handleLabelRoutes(
        new Request('http://localhost/etiquetas/variantes/var_1/preview'),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('rechaza roles no permitidos', async () => {
    mocks.authenticated = true;
    mocks.role = 'BODEGA';

    await expect(
      handleLabelRoutes(
        new Request('http://localhost/etiquetas/variantes/var_1/preview'),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('devuelve null para rutas ajenas', async () => {
    expect(
      await handleLabelRoutes(new Request('http://localhost/variantes/var_1'), {} as ApiEnv),
    ).toBeNull();
  });
});
