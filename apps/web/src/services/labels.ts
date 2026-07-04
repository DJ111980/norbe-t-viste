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

export function openPrintableHtml(html: string, title = 'Etiqueta NORBE T VISTE'): boolean {
  const target = window.open('', '_blank', 'noopener,noreferrer');

  if (!target) {
    return false;
  }

  target.document.open();
  target.document.write(html);
  target.document.title = title;
  target.document.close();

  return true;
}
