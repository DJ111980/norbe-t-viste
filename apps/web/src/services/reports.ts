import { apiRequest } from '../lib/api';
import type {
  EntryLotsReportFilters,
  EntryLotsReportRow,
  EntryLotsReportTotals,
  InventoryMovementReportFilters,
  InventoryMovementReportRow,
  InventoryMovementReportTotals,
  InventoryReportFilters,
  InventoryReportRow,
  InventoryReportTotals,
  PaginatedReport,
  PortfolioReportFilters,
  PortfolioReportRow,
  PortfolioReportTotals,
  ReturnsReportFilters,
  ReturnsReportRow,
  ReturnsReportTotals,
  SalesReportFilters,
  SalesReportRow,
  SalesReportTotals,
} from '../types';

interface ReportResponse<TItem, TTotals> {
  reporte: PaginatedReport<TItem, TTotals>;
}

type ReportFilters =
  | SalesReportFilters
  | InventoryReportFilters
  | InventoryMovementReportFilters
  | PortfolioReportFilters
  | ReturnsReportFilters
  | EntryLotsReportFilters;

function buildReportParams(filters: Partial<ReportFilters>): URLSearchParams {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(filters.page_size ?? 25),
  });

  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || key === 'page_size') continue;
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  return params;
}

async function getReport<TItem, TTotals>(
  token: string,
  path: string,
  filters: Partial<ReportFilters>,
): Promise<PaginatedReport<TItem, TTotals>> {
  const data = await apiRequest<ReportResponse<TItem, TTotals>>(
    `${path}?${buildReportParams(filters)}`,
    { token },
  );

  return data.reporte;
}

export async function getSalesReport(
  token: string,
  filters: Partial<SalesReportFilters>,
): Promise<PaginatedReport<SalesReportRow, SalesReportTotals>> {
  return getReport(token, '/reportes/ventas', filters);
}

export async function getInventoryReport(
  token: string,
  filters: Partial<InventoryReportFilters>,
): Promise<PaginatedReport<InventoryReportRow, InventoryReportTotals>> {
  return getReport(token, '/reportes/inventario', filters);
}

export async function getInventoryMovementReport(
  token: string,
  filters: Partial<InventoryMovementReportFilters>,
): Promise<PaginatedReport<InventoryMovementReportRow, InventoryMovementReportTotals>> {
  return getReport(token, '/reportes/movimientos-inventario', filters);
}

export async function getPortfolioReport(
  token: string,
  filters: Partial<PortfolioReportFilters>,
): Promise<PaginatedReport<PortfolioReportRow, PortfolioReportTotals>> {
  return getReport(token, '/reportes/cartera', filters);
}

export async function getReturnsReport(
  token: string,
  filters: Partial<ReturnsReportFilters>,
): Promise<PaginatedReport<ReturnsReportRow, ReturnsReportTotals>> {
  return getReport(token, '/reportes/devoluciones', filters);
}

export async function getEntryLotsReport(
  token: string,
  filters: Partial<EntryLotsReportFilters>,
): Promise<PaginatedReport<EntryLotsReportRow, EntryLotsReportTotals>> {
  return getReport(token, '/reportes/lotes-entrada', filters);
}
