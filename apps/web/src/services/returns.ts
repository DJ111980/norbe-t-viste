import { apiRequest } from '../lib/api';
import type { CreateSaleReturnResult, SaleReturn, SaleReturnFormValues } from '../types';

interface ListSaleReturnsResponse {
  devoluciones: SaleReturn[];
}

interface CreateSaleReturnResponse {
  devolucion: CreateSaleReturnResult;
}

export async function listSaleReturns(token: string, idVenta: string): Promise<SaleReturn[]> {
  const data = await apiRequest<ListSaleReturnsResponse>(`/ventas/${idVenta}/devoluciones`, {
    token,
  });

  return data.devoluciones;
}

export async function createSaleReturn(
  token: string,
  idVenta: string,
  values: SaleReturnFormValues,
): Promise<CreateSaleReturnResult> {
  const data = await apiRequest<CreateSaleReturnResponse, SaleReturnFormValues>(
    `/ventas/${idVenta}/devoluciones`,
    {
      method: 'POST',
      token,
      body: values,
    },
  );

  return data.devolucion;
}
