export interface BusinessConfigRecord {
  id_configuracion: string;
  nombre_negocio: string;
  logo_imagen: string | null;
}

export interface PublicLogo {
  key: string;
}

export interface LogoUploadInput {
  file: File;
  extension: 'jpg' | 'jpeg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
}
