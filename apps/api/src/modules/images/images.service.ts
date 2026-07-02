import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { buildInternalKey, deleteObject, getObject, uploadObject } from '../../services/r2';
import { toProductImageResponse, toVariantImageResponse } from './images.mapper';
import * as imagesRepository from './images.repository';
import type {
  ImageUploadInput,
  ProductImageRecord,
  ProductImageResponse,
  VariantImageRecord,
  VariantImageResponse,
} from './images.types';

function buildProductImageKey(idProducto: string, extension: string): string {
  return buildInternalKey([
    'productos',
    idProducto,
    'principal',
    `${crypto.randomUUID()}.${extension}`,
  ]);
}

function buildVariantImageKey(idVariante: string, extension: string): string {
  return buildInternalKey(['variantes', idVariante, `${crypto.randomUUID()}.${extension}`]);
}

async function deletePreviousObjectSafely(env: ApiEnv, key: string | null): Promise<void> {
  if (!key) return;

  try {
    await deleteObject(env, key);
  } catch {
    // El reemplazo principal ya quedo guardado. Un fallo borrando el objeto viejo
    // no debe romper la operacion; luego podremos agregar observabilidad.
  }
}

async function ensureProductImage(env: ApiEnv, idProducto: string): Promise<ProductImageRecord> {
  const product = await imagesRepository.findProductImage(env, idProducto);

  if (!product) {
    throw new ApiError('PRODUCT_NOT_FOUND', 'El producto no existe.', 404);
  }

  return product;
}

async function ensureVariantImage(env: ApiEnv, idVariante: string): Promise<VariantImageRecord> {
  const variant = await imagesRepository.findVariantImage(env, idVariante);

  if (!variant) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  return variant;
}

export async function getProductImage(
  env: ApiEnv,
  idProducto: string,
): Promise<ProductImageResponse> {
  return toProductImageResponse(await ensureProductImage(env, idProducto));
}

export async function uploadProductImage(
  env: ApiEnv,
  idProducto: string,
  input: ImageUploadInput,
): Promise<ProductImageResponse> {
  const product = await ensureProductImage(env, idProducto);
  const imageKey = buildProductImageKey(idProducto, input.extension);

  // R2 guarda el binario; D1 solo guarda la key. Esta fase no implementa galeria,
  // QR como imagen, stock ni inventario.
  await uploadObject(env, {
    key: imageKey,
    body: await input.file.arrayBuffer(),
    contentType: input.contentType,
  });

  const updatedProduct = await imagesRepository.updateProductImageKey(env, idProducto, imageKey);

  await deletePreviousObjectSafely(env, product.imagen_principal);

  return toProductImageResponse(updatedProduct);
}

export async function deleteProductImage(
  env: ApiEnv,
  idProducto: string,
): Promise<ProductImageResponse> {
  const product = await ensureProductImage(env, idProducto);

  if (!product.imagen_principal) {
    throw new ApiError(
      'PRODUCT_IMAGE_NOT_CONFIGURED',
      'El producto no tiene imagen configurada.',
      404,
    );
  }

  const updatedProduct = await imagesRepository.updateProductImageKey(env, idProducto, null);

  await deletePreviousObjectSafely(env, product.imagen_principal);

  return toProductImageResponse(updatedProduct);
}

export async function getProductImageFile(env: ApiEnv, idProducto: string): Promise<Response> {
  const product = await ensureProductImage(env, idProducto);

  if (!product.imagen_principal) {
    throw new ApiError(
      'PRODUCT_IMAGE_NOT_CONFIGURED',
      'El producto no tiene imagen configurada.',
      404,
    );
  }

  const object = await getObject(env, product.imagen_principal);

  return new Response(object.body, {
    headers: {
      'content-type': object.contentType,
      'cache-control': 'private, max-age=300',
    },
  });
}

export async function getVariantImage(
  env: ApiEnv,
  idVariante: string,
): Promise<VariantImageResponse> {
  return toVariantImageResponse(await ensureVariantImage(env, idVariante));
}

export async function uploadVariantImage(
  env: ApiEnv,
  idVariante: string,
  input: ImageUploadInput,
): Promise<VariantImageResponse> {
  const variant = await ensureVariantImage(env, idVariante);
  const imageKey = buildVariantImageKey(idVariante, input.extension);

  await uploadObject(env, {
    key: imageKey,
    body: await input.file.arrayBuffer(),
    contentType: input.contentType,
  });

  const updatedVariant = await imagesRepository.updateVariantImageKey(env, idVariante, imageKey);

  await deletePreviousObjectSafely(env, variant.imagen_variante);

  return toVariantImageResponse(updatedVariant);
}

export async function deleteVariantImage(
  env: ApiEnv,
  idVariante: string,
): Promise<VariantImageResponse> {
  const variant = await ensureVariantImage(env, idVariante);

  if (!variant.imagen_variante) {
    throw new ApiError(
      'VARIANT_IMAGE_NOT_CONFIGURED',
      'La variante no tiene imagen configurada.',
      404,
    );
  }

  const updatedVariant = await imagesRepository.updateVariantImageKey(env, idVariante, null);

  await deletePreviousObjectSafely(env, variant.imagen_variante);

  return toVariantImageResponse(updatedVariant);
}

export async function getVariantImageFile(env: ApiEnv, idVariante: string): Promise<Response> {
  const resolvedImage = toVariantImageResponse(await ensureVariantImage(env, idVariante));

  if (!resolvedImage.imagen) {
    throw new ApiError(
      'VARIANT_IMAGE_NOT_CONFIGURED',
      'La variante no tiene imagen disponible.',
      404,
    );
  }

  const object = await getObject(env, resolvedImage.imagen.key);

  return new Response(object.body, {
    headers: {
      'content-type': object.contentType,
      'cache-control': 'private, max-age=300',
    },
  });
}
