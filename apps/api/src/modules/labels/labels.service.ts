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
  EntryLotDetailForLabelsRecord,
  LabelVariantRecord,
  PrintableVariantLabel,
} from './labels.types';
import { MAX_BATCH_LABELS } from './labels.validation';

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

function createPrintableLabelFromEntryLotDetail(
  detail: EntryLotDetailForLabelsRecord,
): PrintableVariantLabel {
  if (!detail.variante_id_variante) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante del detalle no existe.', 404);
  }

  if (!detail.codigo_qr?.trim()) {
    throw new ApiError(
      'VARIANT_QR_CODE_REQUIRED',
      'La variante no tiene codigo QR para imprimir etiqueta.',
      409,
    );
  }

  const codigoQr = detail.codigo_qr.trim();

  return {
    codigoQr,
    talla: normalizeLabelSize(detail.talla),
    qrSvg: createQrSvg(codigoQr),
  };
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

export async function getEntryLotLabelPreviewHtml(env: ApiEnv, idLote: string): Promise<string> {
  const lot = await labelsRepository.findEntryLotForLabels(env, idLote);

  if (!lot) {
    throw new ApiError('ENTRY_LOT_NOT_FOUND', 'El lote de entrada no existe.', 404);
  }

  if (lot.estado_lote === 'BORRADOR') {
    throw new ApiError(
      'LOTE_NO_CONFIRMADO_PARA_ETIQUETAS',
      'El lote debe estar confirmado para imprimir etiquetas.',
      409,
    );
  }

  if (lot.estado_lote === 'ANULADO') {
    throw new ApiError(
      'LOTE_ANULADO_NO_ETIQUETABLE',
      'El lote anulado no permite imprimir etiquetas.',
      409,
    );
  }

  const details = await labelsRepository.findEntryLotDetailsForLabels(env, idLote);

  if (details.length === 0) {
    throw new ApiError('ENTRY_LOT_DETAILS_REQUIRED', 'El lote no tiene detalles.', 409);
  }

  const labels: PrintableVariantLabel[] = [];

  for (const detail of details) {
    const cantidad =
      detail.cantidad_etiquetas_qr && detail.cantidad_etiquetas_qr > 0
        ? detail.cantidad_etiquetas_qr
        : detail.cantidad;

    if (cantidad <= 0) {
      continue;
    }

    const label = createPrintableLabelFromEntryLotDetail(detail);
    labels.push(...Array.from({ length: cantidad }, () => label));
  }

  if (labels.length === 0) {
    throw new ApiError(
      'LOTE_SIN_ETIQUETAS_QR',
      'El lote no tiene etiquetas QR configuradas para imprimir.',
      409,
    );
  }

  if (labels.length > MAX_BATCH_LABELS) {
    throw new ApiError(
      'ETIQUETAS_EXCEDEN_LIMITE',
      `No puedes generar mas de ${MAX_BATCH_LABELS} etiquetas por solicitud.`,
      400,
    );
  }

  return renderLabelsPageHtml(labels);
}
