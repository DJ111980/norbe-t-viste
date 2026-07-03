import type { ApiEnv } from '../../config/env';
import type {
  PortfolioClientRecord,
  PortfolioCreditRecord,
  PortfolioFilters,
  PortfolioPaymentRecord,
  PortfolioSummaryRecord,
} from './portfolio.types';

const PORTFOLIO_CREDIT_COLUMNS = `
  cr.id_credito,
  cr.id_cliente,
  cr.id_venta,
  cr.origen_credito,
  cr.descripcion_credito,
  cr.monto_inicial,
  cr.monto_abonado,
  cr.saldo_pendiente,
  cr.fecha_credito,
  cr.estado_credito,
  c.nombre_completo AS cliente_nombre,
  c.documento AS cliente_documento,
  c.telefono AS cliente_telefono
`;

function buildPortfolioWhere(filters: PortfolioFilters): {
  where: string[];
  values: (string | number)[];
} {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.cliente) {
    where.push('cr.id_cliente = ?');
    values.push(filters.cliente);
  }
  if (filters.estado) {
    where.push('cr.estado_credito = ?');
    values.push(filters.estado);
  }
  if (filters.origenCredito) {
    where.push('cr.origen_credito = ?');
    values.push(filters.origenCredito);
  }
  if (filters.saldoPendiente !== undefined) {
    where.push(filters.saldoPendiente ? 'cr.saldo_pendiente > 0' : 'cr.saldo_pendiente = 0');
  }
  if (filters.fechaDesde) {
    where.push('cr.fecha_credito >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('cr.fecha_credito <= ?');
    values.push(filters.fechaHasta);
  }

  return { where, values };
}

function buildWhereClause(where: string[]): string {
  return where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
}

export async function getPortfolioSummary(
  env: ApiEnv,
  filters: PortfolioFilters,
): Promise<PortfolioSummaryRecord> {
  const { where, values } = buildPortfolioWhere(filters);
  const whereClause = buildWhereClause(where);
  const includeCancelledBalance = filters.estado === 'ANULADO';

  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(*) AS total_creditos,
        COALESCE(SUM(CASE WHEN cr.estado_credito = 'PENDIENTE' THEN 1 ELSE 0 END), 0) AS creditos_pendientes,
        COALESCE(SUM(CASE WHEN cr.estado_credito = 'PARCIAL' THEN 1 ELSE 0 END), 0) AS creditos_parciales,
        COALESCE(SUM(CASE WHEN cr.estado_credito = 'PAGADO' THEN 1 ELSE 0 END), 0) AS creditos_pagados,
        COALESCE(SUM(CASE WHEN cr.estado_credito = 'ANULADO' THEN 1 ELSE 0 END), 0) AS creditos_anulados,
        COALESCE(SUM(cr.monto_inicial), 0) AS total_monto_inicial,
        COALESCE(SUM(cr.monto_abonado), 0) AS total_monto_abonado,
        COALESCE(SUM(CASE WHEN ? = 1 OR cr.estado_credito != 'ANULADO' THEN cr.saldo_pendiente ELSE 0 END), 0) AS total_saldo_pendiente,
        COUNT(DISTINCT CASE WHEN cr.estado_credito != 'ANULADO' AND cr.saldo_pendiente > 0 THEN cr.id_cliente END) AS clientes_con_deuda
      FROM creditos_clientes cr
      INNER JOIN clientes c ON c.id_cliente = cr.id_cliente
      ${whereClause}
    `,
  )
    .bind(includeCancelledBalance ? 1 : 0, ...values)
    .first<PortfolioSummaryRecord>();

  return {
    total_creditos: row?.total_creditos ?? 0,
    creditos_pendientes: row?.creditos_pendientes ?? 0,
    creditos_parciales: row?.creditos_parciales ?? 0,
    creditos_pagados: row?.creditos_pagados ?? 0,
    creditos_anulados: row?.creditos_anulados ?? 0,
    total_monto_inicial: row?.total_monto_inicial ?? 0,
    total_monto_abonado: row?.total_monto_abonado ?? 0,
    total_saldo_pendiente: row?.total_saldo_pendiente ?? 0,
    clientes_con_deuda: row?.clientes_con_deuda ?? 0,
  };
}

export async function listPortfolioCredits(
  env: ApiEnv,
  filters: PortfolioFilters,
): Promise<PortfolioCreditRecord[]> {
  const { where, values } = buildPortfolioWhere(filters);

  const result = await env.DB.prepare(
    `
      SELECT ${PORTFOLIO_CREDIT_COLUMNS}
      FROM creditos_clientes cr
      INNER JOIN clientes c ON c.id_cliente = cr.id_cliente
      ${buildWhereClause(where)}
      ORDER BY cr.fecha_credito DESC, cr.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values, filters.limit, filters.offset)
    .all<PortfolioCreditRecord>();

  return result.results ?? [];
}

export async function findClient(
  env: ApiEnv,
  idCliente: string,
): Promise<PortfolioClientRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_cliente, nombre_completo, documento, telefono, estado
      FROM clientes
      WHERE id_cliente = ?
      LIMIT 1
    `,
  )
    .bind(idCliente)
    .first<PortfolioClientRecord>();
}

export async function listClientPortfolioCredits(
  env: ApiEnv,
  idCliente: string,
): Promise<PortfolioCreditRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT ${PORTFOLIO_CREDIT_COLUMNS}
      FROM creditos_clientes cr
      INNER JOIN clientes c ON c.id_cliente = cr.id_cliente
      WHERE cr.id_cliente = ?
      ORDER BY cr.fecha_credito DESC, cr.creado_en DESC
    `,
  )
    .bind(idCliente)
    .all<PortfolioCreditRecord>();

  return result.results ?? [];
}

export async function findLastClientPayment(
  env: ApiEnv,
  idCliente: string,
): Promise<PortfolioPaymentRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_abono, id_credito, valor_abono, metodo_pago, fecha_abono, creado_en
      FROM abonos_creditos
      WHERE id_cliente = ?
      ORDER BY fecha_abono DESC, creado_en DESC
      LIMIT 1
    `,
  )
    .bind(idCliente)
    .first<PortfolioPaymentRecord>();
}
