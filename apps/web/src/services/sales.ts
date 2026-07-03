import { apiRequest } from '../lib/api';
import type {
  PaymentMethod,
  SaleDetail,
  SaleFormValues,
  SalePayment,
  SaleStatus,
  SaleSummary,
  SaleType,
} from '../types';

interface ListSalesResponse {
  ventas: SaleSummary[];
}

interface SaleResponse {
  venta: SaleDetail;
}

interface CreateSaleResponse {
  venta: {
    id_venta: string;
    numero_venta: string;
    tipo_venta: SaleType;
    estado_venta: SaleStatus;
    total: number;
    saldo_pendiente: number;
    items_vendidos: number;
    movimientos_creados: number;
  };
}

interface SalePaymentsResponse {
  pagos: SalePayment[];
}

interface CancelSaleResponse {
  anulacion: {
    id_venta: string;
    estado_venta: 'ANULADA';
    items_revertidos: number;
    movimientos_creados: number;
    pagos_anulados: number;
    total_unidades_devuelto: number;
  };
}

export interface SaleFilters {
  buscar?: string;
  estado?: SaleStatus | '';
  tipoVenta?: SaleType | '';
}

function toSaleBody(values: SaleFormValues) {
  const detalles = values.detalles.map((detail) => ({
    id_variante: detail.id_variante,
    cantidad: detail.cantidad,
    precio_unitario: detail.precio_unitario,
  }));

  if (values.tipo_venta === 'CREDITO') {
    return {
      tipo_venta: values.tipo_venta,
      id_cliente: values.id_cliente,
      observaciones: values.observaciones || null,
      detalles,
    };
  }

  if (values.tipo_venta === 'MIXTA') {
    return {
      tipo_venta: values.tipo_venta,
      id_cliente: values.id_cliente,
      valor_pagado_inicial: values.valor_pagado_inicial,
      metodo_pago: values.metodo_pago,
      observaciones: values.observaciones || null,
      detalles,
    };
  }

  return {
    tipo_venta: values.tipo_venta,
    id_cliente: values.id_cliente || null,
    metodo_pago: values.metodo_pago,
    observaciones: values.observaciones || null,
    detalles,
  };
}

export async function listSales(token: string, filters: SaleFilters = {}): Promise<SaleSummary[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (filters.buscar?.trim()) params.set('buscar', filters.buscar.trim());
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.tipoVenta) params.set('tipo_venta', filters.tipoVenta);

  const data = await apiRequest<ListSalesResponse>(`/ventas?${params}`, { token });

  return data.ventas;
}

export async function getSale(token: string, idVenta: string): Promise<SaleDetail> {
  const data = await apiRequest<SaleResponse>(`/ventas/${idVenta}`, { token });

  return data.venta;
}

export async function listSalePayments(token: string, idVenta: string): Promise<SalePayment[]> {
  const data = await apiRequest<SalePaymentsResponse>(`/ventas/${idVenta}/pagos`, { token });

  return data.pagos;
}

export async function createSale(
  token: string,
  values: SaleFormValues,
): Promise<CreateSaleResponse['venta']> {
  const data = await apiRequest<CreateSaleResponse, ReturnType<typeof toSaleBody>>('/ventas', {
    method: 'POST',
    token,
    body: toSaleBody(values),
  });

  return data.venta;
}

export async function cancelSale(
  token: string,
  idVenta: string,
  motivoAnulacion: string,
): Promise<CancelSaleResponse['anulacion']> {
  const data = await apiRequest<CancelSaleResponse, { motivo_anulacion: string }>(
    `/ventas/${idVenta}/anular`,
    {
      method: 'POST',
      token,
      body: { motivo_anulacion: motivoAnulacion },
    },
  );

  return data.anulacion;
}

export const paymentMethods: PaymentMethod[] = [
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'NEQUI',
  'DAVIPLATA',
  'OTRO',
];
