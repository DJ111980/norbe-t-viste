import type { ApiEnv } from '../../config/env';
import type { ProductImageRecord, VariantImageRecord } from './images.types';

export async function findProductImage(
  env: ApiEnv,
  idProducto: string,
): Promise<ProductImageRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_producto, imagen_principal
      FROM productos
      WHERE id_producto = ?
      LIMIT 1
    `,
  )
    .bind(idProducto)
    .first<ProductImageRecord>();
}

export async function updateProductImageKey(
  env: ApiEnv,
  idProducto: string,
  imageKey: string | null,
): Promise<ProductImageRecord> {
  await env.DB.prepare(
    `
      UPDATE productos
      SET imagen_principal = ?,
          actualizado_en = datetime('now')
      WHERE id_producto = ?
    `,
  )
    .bind(imageKey, idProducto)
    .run();

  return (await findProductImage(env, idProducto)) as ProductImageRecord;
}

export async function findVariantImage(
  env: ApiEnv,
  idVariante: string,
): Promise<VariantImageRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        v.id_variante,
        v.imagen_variante,
        v.id_producto,
        p.imagen_principal
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.id_variante = ?
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<VariantImageRecord>();
}

export async function updateVariantImageKey(
  env: ApiEnv,
  idVariante: string,
  imageKey: string | null,
): Promise<VariantImageRecord> {
  await env.DB.prepare(
    `
      UPDATE variantes_producto
      SET imagen_variante = ?,
          actualizado_en = datetime('now')
      WHERE id_variante = ?
    `,
  )
    .bind(imageKey, idVariante)
    .run();

  return (await findVariantImage(env, idVariante)) as VariantImageRecord;
}
