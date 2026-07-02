export type ImageOrigin = 'PRODUCTO' | 'VARIANTE' | 'NINGUNA';

export interface ProductImageRecord {
  id_producto: string;
  imagen_principal: string | null;
}

export interface VariantImageRecord {
  id_variante: string;
  imagen_variante: string | null;
  id_producto: string;
  imagen_principal: string | null;
}

export interface PublicImageMetadata {
  key: string;
  origen: Exclude<ImageOrigin, 'NINGUNA'>;
}

export interface ProductImageResponse {
  id_producto: string;
  imagen: PublicImageMetadata | null;
}

export interface VariantImageResponse {
  id_variante: string;
  imagen: PublicImageMetadata | null;
  origen: ImageOrigin;
}

export interface ImageUploadInput {
  file: File;
  extension: 'jpg' | 'jpeg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
}
