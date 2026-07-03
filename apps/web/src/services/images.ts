import { apiBlobRequest, apiFormRequest, apiRequest } from '../lib/api';
import type { ImageMetadata } from '../types';

interface ProductImageResponse {
  productoImagen: {
    id_producto: string;
    imagen: ImageMetadata | null;
  };
}

interface VariantImageResponse {
  varianteImagen: {
    id_variante: string;
    imagen: ImageMetadata | null;
    origen?: 'PRODUCTO' | 'VARIANTE' | 'NINGUNA';
  };
}

export type ImageOwner = 'producto' | 'variante';

function imagePath(owner: ImageOwner, id: string, file = false): string {
  const base = owner === 'producto' ? `/productos/${id}/imagen` : `/variantes/${id}/imagen`;
  return file ? `${base}/file` : base;
}

export async function getImageMetadata(
  token: string,
  owner: ImageOwner,
  id: string,
): Promise<ImageMetadata | null> {
  if (owner === 'producto') {
    const data = await apiRequest<ProductImageResponse>(imagePath(owner, id), { token });
    return data.productoImagen.imagen;
  }

  const data = await apiRequest<VariantImageResponse>(imagePath(owner, id), { token });
  return data.varianteImagen.imagen;
}

export async function getImageObjectUrl(
  token: string,
  owner: ImageOwner,
  id: string,
): Promise<string> {
  const blob = await apiBlobRequest(imagePath(owner, id, true), token);
  return URL.createObjectURL(blob);
}

export async function uploadImage(
  token: string,
  owner: ImageOwner,
  id: string,
  file: File,
): Promise<ImageMetadata | null> {
  const formData = new FormData();
  formData.set('file', file);

  if (owner === 'producto') {
    const data = await apiFormRequest<ProductImageResponse>(imagePath(owner, id), formData, token);
    return data.productoImagen.imagen;
  }

  const data = await apiFormRequest<VariantImageResponse>(imagePath(owner, id), formData, token);
  return data.varianteImagen.imagen;
}

export async function deleteImage(
  token: string,
  owner: ImageOwner,
  id: string,
): Promise<ImageMetadata | null> {
  if (owner === 'producto') {
    const data = await apiRequest<ProductImageResponse>(imagePath(owner, id), {
      method: 'DELETE',
      token,
    });
    return data.productoImagen.imagen;
  }

  const data = await apiRequest<VariantImageResponse>(imagePath(owner, id), {
    method: 'DELETE',
    token,
  });
  return data.varianteImagen.imagen;
}
