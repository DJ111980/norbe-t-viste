import { apiRequest } from '../lib/api';
import type { ClientPortfolio, CreditOrigin, CreditStatus, Portfolio } from '../types';

interface PortfolioResponse {
  cartera: Portfolio;
}

interface ClientPortfolioResponse {
  cartera: ClientPortfolio;
}

export interface PortfolioFilters {
  cliente?: string;
  estado?: CreditStatus | '';
  origenCredito?: CreditOrigin | '';
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

function buildPortfolioParams(filters: PortfolioFilters): URLSearchParams {
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

export async function getPortfolio(
  token: string,
  filters: PortfolioFilters = {},
): Promise<Portfolio> {
  const data = await apiRequest<PortfolioResponse>(`/cartera?${buildPortfolioParams(filters)}`, {
    token,
  });

  return data.cartera;
}

export async function getClientPortfolio(
  token: string,
  idCliente: string,
): Promise<ClientPortfolio> {
  const data = await apiRequest<ClientPortfolioResponse>(`/clientes/${idCliente}/cartera`, {
    token,
  });

  return data.cartera;
}
