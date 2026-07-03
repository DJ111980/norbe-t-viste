import { ApiError } from '../../shared/errors';

export function validateVariantLabelPreviewId(value: string): string {
  const idVariante = value.trim();

  if (!idVariante) {
    throw new ApiError('VARIANT_LABEL_ID_REQUIRED', 'Debes indicar la variante.', 400);
  }

  return idVariante;
}
