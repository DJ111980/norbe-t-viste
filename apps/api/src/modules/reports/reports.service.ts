import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import * as reportsRepository from './reports.repository';
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
  PaginationInput,
  PortfolioReportFilters,
  PortfolioReportRow,
  PortfolioReportTotals,
  ReturnsReportFilters,
  ReturnsReportRow,
  ReturnsReportTotals,
  SalesReportFilters,
  SalesReportRow,
  SalesReportTotals,
} from './reports.types';

function buildPaginatedReport<TItem, TTotals>(
  items: TItem[],
  totales: TTotals,
  totalItems: number,
  pagination: PaginationInput,
): PaginatedReport<TItem, TTotals> {
  return {
    items,
    totales,
    paginacion: {
      page: pagination.page,
      page_size: pagination.pageSize,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / pagination.pageSize),
    },
  };
}

export async function getSalesReport(
  env: ApiEnv,
  auth: AuthContext,
  filters: SalesReportFilters,
): Promise<PaginatedReport<SalesReportRow, SalesReportTotals>> {
  const forcedUserId = auth.user.rol === 'VENDEDOR' ? auth.user.id_usuario : undefined;
  const [items, totales, totalItems] = await Promise.all([
    reportsRepository.listSales(env, filters, forcedUserId),
    reportsRepository.getSalesTotals(env, filters, forcedUserId),
    reportsRepository.countSales(env, filters, forcedUserId),
  ]);

  return buildPaginatedReport(items, totales, totalItems, filters);
}

export async function getInventoryReport(
  env: ApiEnv,
  filters: InventoryReportFilters,
): Promise<PaginatedReport<InventoryReportRow, InventoryReportTotals>> {
  const [items, totales, totalItems] = await Promise.all([
    reportsRepository.listInventory(env, filters),
    reportsRepository.getInventoryTotals(env, filters),
    reportsRepository.countInventory(env, filters),
  ]);

  return buildPaginatedReport(items, totales, totalItems, filters);
}

export async function getInventoryMovementReport(
  env: ApiEnv,
  filters: InventoryMovementReportFilters,
): Promise<PaginatedReport<InventoryMovementReportRow, InventoryMovementReportTotals>> {
  const [items, totales, totalItems] = await Promise.all([
    reportsRepository.listInventoryMovements(env, filters),
    reportsRepository.getInventoryMovementTotals(env, filters),
    reportsRepository.countInventoryMovements(env, filters),
  ]);

  return buildPaginatedReport(items, totales, totalItems, filters);
}

export async function getPortfolioReport(
  env: ApiEnv,
  filters: PortfolioReportFilters,
): Promise<PaginatedReport<PortfolioReportRow, PortfolioReportTotals>> {
  const [items, totales, totalItems] = await Promise.all([
    reportsRepository.listPortfolio(env, filters),
    reportsRepository.getPortfolioTotals(env, filters),
    reportsRepository.countPortfolio(env, filters),
  ]);

  return buildPaginatedReport(items, totales, totalItems, filters);
}

export async function getReturnsReport(
  env: ApiEnv,
  filters: ReturnsReportFilters,
): Promise<PaginatedReport<ReturnsReportRow, ReturnsReportTotals>> {
  const [items, totales, totalItems] = await Promise.all([
    reportsRepository.listReturns(env, filters),
    reportsRepository.getReturnsTotals(env, filters),
    reportsRepository.countReturns(env, filters),
  ]);

  return buildPaginatedReport(items, totales, totalItems, filters);
}

export async function getEntryLotsReport(
  env: ApiEnv,
  filters: EntryLotsReportFilters,
): Promise<PaginatedReport<EntryLotsReportRow, EntryLotsReportTotals>> {
  const [items, totales, totalItems] = await Promise.all([
    reportsRepository.listEntryLots(env, filters),
    reportsRepository.getEntryLotsTotals(env, filters),
    reportsRepository.countEntryLots(env, filters),
  ]);

  return buildPaginatedReport(items, totales, totalItems, filters);
}
