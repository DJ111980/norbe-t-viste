import { describe, expect, it } from 'vitest';
import { toPublicLogo } from './branding.mapper';

describe('branding mapper', () => {
  it('mapper no expone datos innecesarios', () => {
    const logo = toPublicLogo({
      id_configuracion: 'cfg_1',
      nombre_negocio: 'NORBE T VISTE',
      logo_imagen: 'branding/logo/logo.png',
    });

    expect(logo).toEqual({ key: 'branding/logo/logo.png' });
    expect(logo).not.toHaveProperty('nombre_negocio');
  });

  it('devuelve null si no hay logo', () => {
    expect(toPublicLogo(null)).toBeNull();
  });
});
