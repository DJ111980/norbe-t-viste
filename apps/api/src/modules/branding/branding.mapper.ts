import type { BusinessConfigRecord, PublicBranding, PublicLogo } from './branding.types';

const DEFAULT_BUSINESS_NAME = 'NORBE T VISTE';
const DEFAULT_SLOGAN = 'Gestion comercial';
const DEFAULT_LOGIN_DESCRIPTION = 'Gestion comercial lista para operar desde el navegador.';
const DEFAULT_PRIMARY_COLOR = '#b0181b';

export function toPublicLogo(config: BusinessConfigRecord | null): PublicLogo | null {
  if (!config?.logo_imagen) {
    return null;
  }

  // Solo se expone la key interna. El binario sale por /branding/logo/file desde R2.
  return {
    key: config.logo_imagen,
    url: '/branding/logo/file',
    existe: true,
  };
}

export function toPublicBranding(config: BusinessConfigRecord | null): PublicBranding {
  return {
    nombre_negocio: config?.nombre_negocio ?? DEFAULT_BUSINESS_NAME,
    eslogan: config?.eslogan ?? DEFAULT_SLOGAN,
    descripcion_login: config?.descripcion_login ?? DEFAULT_LOGIN_DESCRIPTION,
    color_principal: config?.color_principal ?? DEFAULT_PRIMARY_COLOR,
    logo: toPublicLogo(config),
  };
}
