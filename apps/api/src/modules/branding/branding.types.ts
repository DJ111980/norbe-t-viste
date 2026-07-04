export interface BusinessConfigRecord {
  id_configuracion: string;
  nombre_negocio: string;
  eslogan: string | null;
  descripcion_login: string | null;
  color_principal: string | null;
  logo_imagen: string | null;
}

export interface PublicLogo {
  key: string;
  url: string;
  existe: true;
}

export interface PublicBranding {
  nombre_negocio: string;
  eslogan: string;
  descripcion_login: string;
  color_principal: string;
  logo: PublicLogo | null;
}

export interface LogoUploadInput {
  file: File;
  extension: 'jpg' | 'jpeg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
}

export interface UpdateBrandingInput {
  nombreNegocio?: string;
  eslogan?: string;
  descripcionLogin?: string;
  colorPrincipal?: string;
}
