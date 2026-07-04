import { apiTextRequest } from '../lib/api';
import type { LabelBatchItemFormValues } from '../types';

export async function getVariantLabelPreview(token: string, idVariante: string): Promise<string> {
  return apiTextRequest(`/etiquetas/variantes/${idVariante}/preview`, token);
}

export async function getEntryLotLabelPreview(token: string, idLote: string): Promise<string> {
  return apiTextRequest(`/etiquetas/lotes-entrada/${idLote}/preview`, token);
}

export async function getBatchVariantLabelPreview(
  token: string,
  items: LabelBatchItemFormValues[],
): Promise<string> {
  return apiTextRequest('/etiquetas/variantes/preview-lote', token, {
    method: 'POST',
    body: { items },
  });
}
