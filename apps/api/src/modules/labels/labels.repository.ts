import type { ApiEnv } from '../../config/env';
import type {
  EntryLotDetailForLabelsRecord,
  EntryLotForLabelsRecord,
  LabelVariantRecord,
} from './labels.types';

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
        v.precio_venta,
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

export async function findEntryLotForLabels(
  env: ApiEnv,
  idLote: string,
): Promise<EntryLotForLabelsRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_lote, estado_lote
      FROM lotes_entrada
      WHERE id_lote = ?
      LIMIT 1
    `,
  )
    .bind(idLote)
    .first<EntryLotForLabelsRecord>();
}

export async function findEntryLotDetailsForLabels(
  env: ApiEnv,
  idLote: string,
): Promise<EntryLotDetailForLabelsRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        d.id_detalle_lote,
        d.id_variante,
        d.cantidad,
        d.cantidad_etiquetas_qr,
        v.id_variante AS variante_id_variante,
        v.codigo_qr,
        v.talla,
        v.precio_venta,
        v.estado AS estado_variante,
        p.estado AS estado_producto
      FROM detalle_lotes_entrada d
      LEFT JOIN variantes_producto v ON v.id_variante = d.id_variante
      LEFT JOIN productos p ON p.id_producto = v.id_producto
      WHERE d.id_lote = ?
      ORDER BY d.creado_en ASC
    `,
  )
    .bind(idLote)
    .all<EntryLotDetailForLabelsRecord>();

  return result.results ?? [];
}
