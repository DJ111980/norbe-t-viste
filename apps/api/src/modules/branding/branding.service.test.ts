import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { BusinessConfigRecord, LogoUploadInput } from './branding.types';

const mocks = vi.hoisted(() => ({
  config: null as BusinessConfigRecord | null,
  uploaded: null as { key: string; contentType: string; body: ArrayBuffer } | null,
  deletedKeys: [] as string[],
}));

vi.mock('../../services/r2', () => ({
  buildInternalKey: vi.fn((parts: string[]) => parts.join('/')),
  uploadObject: vi.fn(async (_env: ApiEnv, input) => {
    mocks.uploaded = input;
  }),
  getObject: vi.fn(async (_env: ApiEnv, key: string) => {
    if (key !== mocks.config?.logo_imagen) throw new Error('missing object');
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('logo'));
          controller.close();
        },
      }),
      contentType: 'image/png',
    };
  }),
  deleteObject: vi.fn(async (_env: ApiEnv, key: string) => {
    mocks.deletedKeys.push(key);
  }),
}));

vi.mock('./branding.repository', () => ({
  getBusinessConfig: vi.fn(async () => mocks.config),
  ensureBusinessConfig: vi.fn(async () => {
    if (!mocks.config) {
      mocks.config = {
        id_configuracion: 'configuracion_principal',
        nombre_negocio: 'NORBE T VISTE',
        eslogan: 'Gestion comercial',
        descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
        color_principal: '#b0181b',
        logo_imagen: null,
      };
    }
    return mocks.config;
  }),
  updateLogoKey: vi.fn(async (_env: ApiEnv, idConfiguracion: string, logoKey: string | null) => {
    mocks.config = {
      id_configuracion: idConfiguracion,
      nombre_negocio: 'NORBE T VISTE',
      eslogan: 'Gestion comercial',
      descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
      color_principal: '#b0181b',
      logo_imagen: logoKey,
    };
    return mocks.config;
  }),
}));

const { deleteLogo, getLogo, getLogoFile, uploadLogo } = await import('./branding.service');

const env = {} as ApiEnv;

function createLogoInput(
  file = new File(['logo'], 'logo.png', { type: 'image/png' }),
): LogoUploadInput {
  return {
    file,
    extension: 'png',
    contentType: 'image/png',
    size: file.size,
  };
}

describe('branding service', () => {
  beforeEach(() => {
    mocks.config = null;
    mocks.uploaded = null;
    mocks.deletedKeys = [];
  });

  it('ADMINISTRADOR puede subir logo valido y D1 guarda solo key', async () => {
    const logo = await uploadLogo(env, createLogoInput());

    expect(logo.key).toMatch(/^branding\/logo\/.+\.png$/);
    expect(mocks.uploaded?.key).toBe(logo.key);
    expect(mocks.uploaded?.contentType).toBe('image/png');
    expect(mocks.config?.logo_imagen).toBe(logo.key);
    expect(mocks.config?.logo_imagen).not.toBe('logo.png');
  });

  it('reemplazar logo intenta borrar objeto anterior de R2', async () => {
    mocks.config = {
      id_configuracion: 'cfg_1',
      nombre_negocio: 'NORBE T VISTE',
      eslogan: 'Gestion comercial',
      descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
      color_principal: '#b0181b',
      logo_imagen: 'branding/logo/anterior.png',
    };

    const logo = await uploadLogo(env, createLogoInput());

    expect(logo.key).not.toBe('branding/logo/anterior.png');
    expect(mocks.deletedKeys).toContain('branding/logo/anterior.png');
  });

  it('GET logo devuelve metadata y file obtiene archivo desde R2', async () => {
    mocks.config = {
      id_configuracion: 'cfg_1',
      nombre_negocio: 'NORBE T VISTE',
      eslogan: 'Gestion comercial',
      descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
      color_principal: '#b0181b',
      logo_imagen: 'branding/logo/logo.png',
    };

    expect(await getLogo(env)).toEqual({
      key: 'branding/logo/logo.png',
      url: '/branding/logo/file',
      existe: true,
    });

    const response = await getLogoFile(env);

    expect(response.headers.get('content-type')).toBe('image/png');
    expect(await response.text()).toBe('logo');
  });

  it('DELETE limpia referencia e intenta borrar objeto de R2', async () => {
    mocks.config = {
      id_configuracion: 'cfg_1',
      nombre_negocio: 'NORBE T VISTE',
      eslogan: 'Gestion comercial',
      descripcion_login: 'Gestion comercial lista para operar desde el navegador.',
      color_principal: '#b0181b',
      logo_imagen: 'branding/logo/logo.png',
    };

    const logo = await deleteLogo(env);

    expect(logo).toBeNull();
    expect(mocks.config.logo_imagen).toBeNull();
    expect(mocks.deletedKeys).toEqual(['branding/logo/logo.png']);
  });
});
