import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { renderVariantLabelHtml, normalizeLabelSize } from './labels.html';
import { createQrSvg } from './labels.qr';
import * as labelsRepository from './labels.repository';

export async function getVariantLabelPreviewHtml(env: ApiEnv, idVariante: string): Promise<string> {
  const variant = await labelsRepository.findLabelVariantById(env, idVariante);

  if (!variant) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  if (!variant.codigo_qr?.trim()) {
    throw new ApiError(
      'VARIANT_QR_CODE_REQUIRED',
      'La variante no tiene codigo QR para imprimir etiqueta.',
      409,
    );
  }

  const codigoQr = variant.codigo_qr.trim();

  return renderVariantLabelHtml({
    codigoQr,
    talla: normalizeLabelSize(variant.talla),
    qrSvg: createQrSvg(codigoQr),
  });
}
