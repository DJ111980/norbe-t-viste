import type { BusinessConfigRecord, PublicLogo } from './branding.types';

export function toPublicLogo(config: BusinessConfigRecord | null): PublicLogo | null {
  if (!config?.logo_imagen) {
    return null;
  }

  // Solo se expone la key interna. El binario sale por /branding/logo/file desde R2.
  return {
    key: config.logo_imagen,
  };
}
