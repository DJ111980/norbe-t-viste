import type { ApiEnv } from '../../config/env';
import type { LabelVariantRecord } from './labels.types';

export async function findLabelVariantById(
  env: ApiEnv,
  idVariante: string,
): Promise<LabelVariantRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        v.id_variante,
        v.codigo_qr,
        v.talla,
        v.estado,
        p.estado AS estado_producto
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.id_variante = ?
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<LabelVariantRecord>();
}
