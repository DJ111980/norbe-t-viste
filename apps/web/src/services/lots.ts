import { apiRequest } from '../lib/api';
import type {
  EntryLot,
  EntryLotDetail,
  EntryLotDetailFormValues,
  EntryLotFormValues,
  EntryLotStatus,
  EntryLotSummary,
} from '../types';

interface ListEntryLotsResponse {
  lotes: EntryLotSummary[];
}

interface EntryLotResponse {
  lote: EntryLot;
}

interface EntryLotDetailResponse {
  detalle: EntryLotDetail | null;
}

interface ConfirmEntryLotResponse {
  confirmacion: {
    id_lote: string;
    estado_lote: 'CONFIRMADO';
    detalles_procesados: number;
    movimientos_creados: number;
    total_unidades_ingresadas: number;
  };
}

interface CancelEntryLotResponse {
  anulacion: {
    id_lote: string;
    estado_lote: 'ANULADO';
    detalles_procesados: number;
    movimientos_creados: number;
    total_unidades_reversadas: number;
  };
}

export interface EntryLotFilters {
  estado?: EntryLotStatus | '';
  buscar?: string;
}

function toLotBody(values: EntryLotFormValues) {
  return {
    id_proveedor: values.id_proveedor || null,
    numero_factura: values.numero_factura || null,
    fecha_lote: values.fecha_lote,
    observaciones: values.observaciones || null,
  };
}

function toDetailBody(values: EntryLotDetailFormValues) {
  return {
    id_variante: values.id_variante,
    cantidad: values.cantidad,
    costo_unitario: values.costo_unitario,
    precio_venta_sugerido: values.precio_venta_sugerido,
    cantidad_etiquetas_qr: values.cantidad_etiquetas_qr,
    observaciones: values.observaciones || null,
  };
}

export async function listEntryLots(
  token: string,
  filters: EntryLotFilters = {},
): Promise<EntryLotSummary[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (filters.estado) params.set('estado', filters.estado);
  if (filters.buscar?.trim()) params.set('buscar', filters.buscar.trim());

  const data = await apiRequest<ListEntryLotsResponse>(`/lotes-entrada?${params}`, { token });

  return data.lotes;
}

export async function getEntryLot(token: string, idLote: string): Promise<EntryLot> {
  const data = await apiRequest<EntryLotResponse>(`/lotes-entrada/${idLote}`, { token });

  return data.lote;
}

export async function createEntryLot(token: string, values: EntryLotFormValues): Promise<EntryLot> {
  const data = await apiRequest<EntryLotResponse, ReturnType<typeof toLotBody>>('/lotes-entrada', {
    method: 'POST',
    token,
    body: toLotBody(values),
  });

  return data.lote;
}

export async function updateEntryLot(
  token: string,
  idLote: string,
  values: EntryLotFormValues,
): Promise<EntryLot> {
  const data = await apiRequest<EntryLotResponse, ReturnType<typeof toLotBody>>(
    `/lotes-entrada/${idLote}`,
    {
      method: 'PATCH',
      token,
      body: toLotBody(values),
    },
  );

  return data.lote;
}

export async function createEntryLotDetail(
  token: string,
  idLote: string,
  values: EntryLotDetailFormValues,
): Promise<EntryLotDetail> {
  const data = await apiRequest<EntryLotDetailResponse, ReturnType<typeof toDetailBody>>(
    `/lotes-entrada/${idLote}/detalles`,
    {
      method: 'POST',
      token,
      body: toDetailBody(values),
    },
  );

  return data.detalle as EntryLotDetail;
}

export async function updateEntryLotDetail(
  token: string,
  idLote: string,
  idDetalle: string,
  values: EntryLotDetailFormValues,
): Promise<EntryLotDetail> {
  const body = {
    cantidad: values.cantidad,
    costo_unitario: values.costo_unitario,
    precio_venta_sugerido: values.precio_venta_sugerido,
    cantidad_etiquetas_qr: values.cantidad_etiquetas_qr,
    observaciones: values.observaciones || null,
  };
  const data = await apiRequest<EntryLotDetailResponse, typeof body>(
    `/lotes-entrada/${idLote}/detalles/${idDetalle}`,
    {
      method: 'PATCH',
      token,
      body,
    },
  );

  return data.detalle as EntryLotDetail;
}

export async function deleteEntryLotDetail(
  token: string,
  idLote: string,
  idDetalle: string,
): Promise<void> {
  await apiRequest<EntryLotDetailResponse>(`/lotes-entrada/${idLote}/detalles/${idDetalle}`, {
    method: 'DELETE',
    token,
  });
}

export async function confirmEntryLot(
  token: string,
  idLote: string,
): Promise<ConfirmEntryLotResponse['confirmacion']> {
  const data = await apiRequest<ConfirmEntryLotResponse>(`/lotes-entrada/${idLote}/confirmar`, {
    method: 'POST',
    token,
  });

  return data.confirmacion;
}

export async function cancelEntryLot(
  token: string,
  idLote: string,
  motivo: string,
): Promise<CancelEntryLotResponse['anulacion']> {
  const data = await apiRequest<CancelEntryLotResponse, { motivo: string }>(
    `/lotes-entrada/${idLote}/anular`,
    {
      method: 'POST',
      token,
      body: { motivo },
    },
  );

  return data.anulacion;
}
