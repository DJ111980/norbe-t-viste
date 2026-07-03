import { apiRequest } from '../lib/api';
import type {
  CreditAdjustmentFormValues,
  CreditDetail,
  CreditOrigin,
  CreditPaymentFormValues,
  CreditStatus,
  CreditSummary,
  OldDebtFormValues,
  PaymentMethod,
} from '../types';

interface ListCreditsResponse {
  creditos: CreditSummary[];
}

interface CreditResponse {
  credito: CreditDetail;
}

interface CreateOldDebtResponse {
  credito: {
    id_credito: string;
    id_cliente: string;
    origen_credito: 'DEUDA_ANTIGUA';
    tipo_deuda_antigua: string;
    monto_inicial: number;
    monto_abonado: number;
    saldo_pendiente: number;
    estado_credito: 'PENDIENTE';
  };
}

interface CreateCreditPaymentResponse {
  abono: {
    id_credito: string;
    id_abono: string;
    valor_abono: number;
    saldo_anterior: number;
    saldo_nuevo: number;
    estado_credito: 'PARCIAL' | 'PAGADO';
  };
}

interface CreateCreditAdjustmentResponse {
  ajuste: {
    id_credito: string;
    id_ajuste: string;
    tipo_ajuste: 'AUMENTO' | 'DESCUENTO' | 'CORRECCION';
    valor_ajuste: number;
    saldo_antes: number;
    saldo_despues: number;
    estado_credito: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
  };
}

interface CancelCreditPaymentResponse {
  anulacion: {
    id_credito: string;
    id_abono: string;
    estado_abono: 'ANULADO';
    valor_abono_anulado: number;
    saldo_anterior: number;
    saldo_nuevo: number;
    monto_abonado_anterior: number;
    monto_abonado_nuevo: number;
    estado_credito: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
  };
}

interface CancelCreditResponse {
  anulacion: {
    id_credito: string;
    estado_credito: 'ANULADO';
    saldo_anterior: number;
    saldo_nuevo: 0;
    monto_inicial: number;
    monto_abonado: number;
  };
}

export interface CreditFilters {
  cliente?: string;
  estado?: CreditStatus | '';
  origenCredito?: CreditOrigin | '';
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

export const creditPaymentMethods: PaymentMethod[] = [
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'NEQUI',
  'DAVIPLATA',
  'OTRO',
];

function buildCreditParams(filters: CreditFilters): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(filters.limit ?? 100),
    offset: String(filters.offset ?? 0),
  });

  if (filters.cliente?.trim()) params.set('cliente', filters.cliente.trim());
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.origenCredito) params.set('origen_credito', filters.origenCredito);
  if (filters.fechaDesde) params.set('fecha_desde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fecha_hasta', filters.fechaHasta);

  return params;
}

export async function listCredits(
  token: string,
  filters: CreditFilters = {},
): Promise<CreditSummary[]> {
  const data = await apiRequest<ListCreditsResponse>(`/creditos?${buildCreditParams(filters)}`, {
    token,
  });

  return data.creditos;
}

export async function getCredit(token: string, idCredito: string): Promise<CreditDetail> {
  const data = await apiRequest<CreditResponse>(`/creditos/${idCredito}`, { token });

  return data.credito;
}

export async function listClientCredits(
  token: string,
  idCliente: string,
): Promise<CreditSummary[]> {
  const data = await apiRequest<ListCreditsResponse>(`/clientes/${idCliente}/creditos`, { token });

  return data.creditos;
}

export async function createOldDebt(
  token: string,
  values: OldDebtFormValues,
): Promise<CreateOldDebtResponse['credito']> {
  const data = await apiRequest<CreateOldDebtResponse, OldDebtFormValues>(
    '/creditos/deuda-antigua',
    {
      method: 'POST',
      token,
      body: values,
    },
  );

  return data.credito;
}

export async function createCreditPayment(
  token: string,
  idCredito: string,
  values: CreditPaymentFormValues,
): Promise<CreateCreditPaymentResponse['abono']> {
  const body = {
    valor_abono: values.valor_abono,
    metodo_pago: values.metodo_pago,
    referencia_pago: values.referencia_pago || null,
    observaciones: values.observaciones || null,
  };
  const data = await apiRequest<CreateCreditPaymentResponse, typeof body>(
    `/creditos/${idCredito}/abonos`,
    {
      method: 'POST',
      token,
      body,
    },
  );

  return data.abono;
}

export async function cancelCreditPayment(
  token: string,
  idCredito: string,
  idAbono: string,
  motivoAnulacion: string,
): Promise<CancelCreditPaymentResponse['anulacion']> {
  const data = await apiRequest<CancelCreditPaymentResponse, { motivo_anulacion: string }>(
    `/creditos/${idCredito}/abonos/${idAbono}/anular`,
    {
      method: 'POST',
      token,
      body: { motivo_anulacion: motivoAnulacion },
    },
  );

  return data.anulacion;
}

export async function createCreditAdjustment(
  token: string,
  idCredito: string,
  values: CreditAdjustmentFormValues,
): Promise<CreateCreditAdjustmentResponse['ajuste']> {
  const body =
    values.tipo_ajuste === 'CORRECCION'
      ? {
          tipo_ajuste: values.tipo_ajuste,
          saldo_final: values.saldo_final,
          motivo: values.motivo,
        }
      : {
          tipo_ajuste: values.tipo_ajuste,
          valor_ajuste: values.valor_ajuste,
          motivo: values.motivo,
        };
  const data = await apiRequest<CreateCreditAdjustmentResponse, typeof body>(
    `/creditos/${idCredito}/ajustes`,
    {
      method: 'POST',
      token,
      body,
    },
  );

  return data.ajuste;
}

export async function cancelCredit(
  token: string,
  idCredito: string,
  motivoAnulacion: string,
): Promise<CancelCreditResponse['anulacion']> {
  const data = await apiRequest<CancelCreditResponse, { motivo_anulacion: string }>(
    `/creditos/${idCredito}/anular`,
    {
      method: 'POST',
      token,
      body: { motivo_anulacion: motivoAnulacion },
    },
  );

  return data.anulacion;
}
