import { apiRequest } from '../lib/api';
import type { Variant, VariantFormValues, VariantStatus } from '../types';

interface ListVariantsResponse {
  variantes: Variant[];
}

interface VariantResponse {
  variante: Variant;
}

export interface VariantFilters {
  buscar?: string;
  producto?: string;
  estado?: VariantStatus | '';
  codigoQr?: string;
  sku?: string;
}

function toVariantBody(values: VariantFormValues) {
  return {
    talla: values.talla,
    color: values.color,
    sku: values.sku,
    precio_venta: values.precio_venta,
    precio_compra_referencia: values.precio_compra_referencia,
    stock_minimo: values.stock_minimo,
  };
}

export async function listVariants(token: string, filters: VariantFilters): Promise<Variant[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (filters.buscar?.trim()) params.set('buscar', filters.buscar.trim());
  if (filters.producto?.trim()) params.set('producto', filters.producto.trim());
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.codigoQr?.trim()) params.set('codigo_qr', filters.codigoQr.trim());
  if (filters.sku?.trim()) params.set('sku', filters.sku.trim());

  const data = await apiRequest<ListVariantsResponse>(`/variantes?${params}`, { token });

  return data.variantes;
}

export async function createVariant(token: string, values: VariantFormValues): Promise<Variant> {
  const data = await apiRequest<VariantResponse, ReturnType<typeof toVariantBody>>(
    `/productos/${values.id_producto}/variantes`,
    {
      method: 'POST',
      token,
      body: toVariantBody(values),
    },
  );

  return data.variante;
}

export async function updateVariant(
  token: string,
  idVariante: string,
  values: VariantFormValues,
): Promise<Variant> {
  const data = await apiRequest<VariantResponse, ReturnType<typeof toVariantBody>>(
    `/variantes/${idVariante}`,
    {
      method: 'PATCH',
      token,
      body: toVariantBody(values),
    },
  );

  return data.variante;
}

export async function updateVariantStatus(
  token: string,
  idVariante: string,
  estado: VariantStatus,
): Promise<Variant> {
  const data = await apiRequest<VariantResponse, { estado: VariantStatus }>(
    `/variantes/${idVariante}/estado`,
    {
      method: 'PATCH',
      token,
      body: { estado },
    },
  );

  return data.variante;
}

export async function getVariantByQr(token: string, codigoQr: string): Promise<Variant> {
  const data = await apiRequest<VariantResponse>(`/variantes/qr/${encodeURIComponent(codigoQr)}`, {
    token,
  });

  return data.variante;
}
