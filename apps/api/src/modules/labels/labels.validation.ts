import { ApiError } from '../../shared/errors';
import type { BatchLabelItemInput } from './labels.types';

export const MAX_BATCH_LABELS = 100;

export function validateVariantLabelPreviewId(value: string): string {
  const idVariante = value.trim();

  if (!idVariante) {
    throw new ApiError('VARIANT_LABEL_ID_REQUIRED', 'Debes indicar la variante.', 400);
  }

  return idVariante;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateBatchLabelPreviewInput(body: unknown): BatchLabelItemInput[] {
  if (!isRecord(body)) {
    throw new ApiError('INVALID_LABEL_BATCH_BODY', 'El cuerpo debe ser un objeto valido.', 400);
  }

  if (!Array.isArray(body.items)) {
    throw new ApiError('LABEL_BATCH_ITEMS_REQUIRED', 'Debes enviar items para imprimir.', 400);
  }

  if (body.items.length === 0) {
    throw new ApiError('LABEL_BATCH_ITEMS_REQUIRED', 'Debes enviar al menos un item.', 400);
  }

  const byVariant = new Map<string, number>();

  for (const item of body.items) {
    if (!isRecord(item)) {
      throw new ApiError('INVALID_LABEL_BATCH_ITEM', 'Cada item debe ser un objeto valido.', 400);
    }

    if (typeof item.id_variante !== 'string') {
      throw new ApiError('VARIANT_LABEL_ID_REQUIRED', 'Debes indicar la variante.', 400);
    }

    const idVariante = validateVariantLabelPreviewId(item.id_variante);

    if (typeof item.cantidad !== 'number' || !Number.isInteger(item.cantidad)) {
      throw new ApiError('LABEL_QUANTITY_INVALID', 'La cantidad debe ser un entero.', 400);
    }

    if (item.cantidad <= 0) {
      throw new ApiError('LABEL_QUANTITY_INVALID', 'La cantidad debe ser mayor que cero.', 400);
    }

    byVariant.set(idVariante, (byVariant.get(idVariante) ?? 0) + item.cantidad);
  }

  const totalLabels = [...byVariant.values()].reduce((total, cantidad) => total + cantidad, 0);

  if (totalLabels > MAX_BATCH_LABELS) {
    throw new ApiError(
      'LABEL_BATCH_LIMIT_EXCEEDED',
      `No puedes generar mas de ${MAX_BATCH_LABELS} etiquetas por solicitud.`,
      400,
    );
  }

  return [...byVariant.entries()].map(([idVariante, cantidad]) => ({ idVariante, cantidad }));
}
