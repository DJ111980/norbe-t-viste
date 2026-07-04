import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { handleBrandingRoutes } from './branding.routes';

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
        nombre_usuario: mocks.role.toLowerCase(),
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

vi.mock('./branding.validation', () => ({
  validateLogoUploadRequest: vi.fn(async () => ({
    file: new File(['logo'], 'logo.png', { type: 'image/png' }),
    extension: 'png',
    contentType: 'image/png',
    size: 4,
  })),
  validateUpdateBrandingInput: vi.fn(() => ({
    nombreNegocio: 'NORBE T VISTE',
  })),
}));

vi.mock('./branding.service', () => ({
  getBranding: vi.fn(async () => ({
    nombre_negocio: 'NORBE T VISTE',
    eslogan: 'Gestion comercial',
    descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
    color_principal: '#b0181b',
    logo: null,
  })),
  updateBranding: vi.fn(async () => ({
    nombre_negocio: 'NORBE T VISTE',
    eslogan: 'Gestion comercial',
    descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
    color_principal: '#b0181b',
    logo: null,
  })),
  getLogo: vi.fn(async () => ({ key: 'branding/logo/logo.png' })),
  uploadLogo: vi.fn(async () => ({ key: 'branding/logo/logo.png' })),
  deleteLogo: vi.fn(async () => null),
  getLogoFile: vi.fn(
    async () => new Response('logo', { headers: { 'content-type': 'image/png' } }),
  ),
}));

describe('branding routes', () => {
  it('GET /branding es publico para cargar login', async () => {
    mocks.authenticated = false;

    expect(
      (await handleBrandingRoutes(new Request('http://localhost/branding'), {} as ApiEnv))?.status,
    ).toBe(200);
  });

  it('solo ADMINISTRADOR puede actualizar branding global', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleBrandingRoutes(
        new Request('http://localhost/branding', { method: 'PATCH', body: '{}' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleBrandingRoutes(
          new Request('http://localhost/branding', { method: 'PATCH', body: '{}' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });

  it('VENDEDOR puede consultar logo y archivo', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    expect(
      (await handleBrandingRoutes(new Request('http://localhost/branding/logo'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
    expect(
      (await handleBrandingRoutes(new Request('http://localhost/branding/logo/file'), {} as ApiEnv))
        ?.status,
    ).toBe(200);
  });

  it('VENDEDOR no puede subir ni eliminar logo', async () => {
    mocks.authenticated = true;
    mocks.role = 'VENDEDOR';

    await expect(
      handleBrandingRoutes(
        new Request('http://localhost/branding/logo', { method: 'POST' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      handleBrandingRoutes(
        new Request('http://localhost/branding/logo', { method: 'DELETE' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('sin token no puede subir logo', async () => {
    mocks.authenticated = false;

    await expect(
      handleBrandingRoutes(
        new Request('http://localhost/branding/logo', { method: 'POST' }),
        {} as ApiEnv,
      ),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 });
  });

  it('ADMINISTRADOR puede subir y eliminar logo', async () => {
    mocks.authenticated = true;
    mocks.role = 'ADMINISTRADOR';

    expect(
      (
        await handleBrandingRoutes(
          new Request('http://localhost/branding/logo', { method: 'POST' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(201);
    expect(
      (
        await handleBrandingRoutes(
          new Request('http://localhost/branding/logo', { method: 'DELETE' }),
          {} as ApiEnv,
        )
      )?.status,
    ).toBe(200);
  });
});
