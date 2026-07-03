import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import {
  renderLabelsPageHtml,
  renderVariantLabelHtml,
  normalizeLabelSize,
} from './labels.renderer';
import { createQrSvg } from './labels.qr';
import * as labelsRepository from './labels.repository';
import type {
  BatchLabelItemInput,
  LabelVariantRecord,
  PrintableVariantLabel,
} from './labels.types';

async function getPrintableLabel(env: ApiEnv, idVariante: string): Promise<PrintableVariantLabel> {
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

  return {
    codigoQr,
    talla: normalizeLabelSize(variant.talla),
    qrSvg: createQrSvg(codigoQr),
  };
}

function expandBatchLabels(variant: LabelVariantRecord, cantidad: number): PrintableVariantLabel[] {
  const codigoQr = (variant.codigo_qr as string).trim();
  const label = {
    codigoQr,
    talla: normalizeLabelSize(variant.talla),
    qrSvg: createQrSvg(codigoQr),
  };

  return Array.from({ length: cantidad }, () => label);
}

export async function getVariantLabelPreviewHtml(env: ApiEnv, idVariante: string): Promise<string> {
  return renderVariantLabelHtml(await getPrintableLabel(env, idVariante));
}

export async function getBatchVariantLabelPreviewHtml(
  env: ApiEnv,
  items: BatchLabelItemInput[],
): Promise<string> {
  const labels: PrintableVariantLabel[] = [];

  for (const item of items) {
    const variant = await labelsRepository.findLabelVariantById(env, item.idVariante);

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

    labels.push(...expandBatchLabels(variant, item.cantidad));
  }

  return renderLabelsPageHtml(labels);
}
