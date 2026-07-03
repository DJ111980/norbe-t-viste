import type { ApiEnv } from '../../config/env';
import type {
  DashboardAlertsSummary,
  DashboardDateRange,
  DashboardEntryLotsSummary,
  DashboardInventorySummary,
  DashboardPaymentsSummary,
  DashboardPortfolioSummary,
  DashboardReturnsSummary,
  DashboardSalesSummary,
} from './dashboard.types';

function sellerClause(idUsuario?: string): { sql: string; values: string[] } {
  return idUsuario ? { sql: ' AND id_usuario = ?', values: [idUsuario] } : { sql: '', values: [] };
}

export async function getSalesSummary(
  env: ApiEnv,
  range: DashboardDateRange,
  idUsuario?: string,
): Promise<DashboardSalesSummary> {
  const seller = sellerClause(idUsuario);
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(CASE WHEN estado_venta != 'ANULADA' THEN 1 END) AS cantidad_total,
        COALESCE(SUM(CASE WHEN estado_venta != 'ANULADA' THEN total ELSE 0 END), 0) AS total_vendido,
        COALESCE(SUM(CASE WHEN estado_venta != 'ANULADA' AND tipo_venta = 'CONTADO' THEN total ELSE 0 END), 0) AS total_contado,
        COALESCE(SUM(CASE WHEN estado_venta != 'ANULADA' AND tipo_venta = 'CREDITO' THEN total ELSE 0 END), 0) AS total_credito,
        COALESCE(SUM(CASE WHEN estado_venta != 'ANULADA' AND tipo_venta = 'MIXTA' THEN total ELSE 0 END), 0) AS total_mixto,
        COUNT(CASE WHEN estado_venta = 'ANULADA' THEN 1 END) AS ventas_anuladas
      FROM ventas
      WHERE creado_en >= ?
        AND creado_en <= ?
        ${seller.sql}
    `,
  )
    .bind(range.fechaDesde, range.fechaHasta, ...seller.values)
    .first<DashboardSalesSummary>();

  return {
    cantidad_total: row?.cantidad_total ?? 0,
    total_vendido: row?.total_vendido ?? 0,
    total_contado: row?.total_contado ?? 0,
    total_credito: row?.total_credito ?? 0,
    total_mixto: row?.total_mixto ?? 0,
    ventas_anuladas: row?.ventas_anuladas ?? 0,
  };
}

export async function getPaymentsSummary(
  env: ApiEnv,
  range: DashboardDateRange,
  idUsuario?: string,
): Promise<DashboardPaymentsSummary> {
  const seller = idUsuario
    ? { sql: ' AND pv.id_usuario = ?', values: [idUsuario] }
    : { sql: '', values: [] };
  const row = await env.DB.prepare(
    `
      SELECT COALESCE(SUM(valor_pagado), 0) AS total_recibido
      FROM pagos_ventas pv
      WHERE pv.estado_pago = 'ACTIVO'
        AND pv.creado_en >= ?
        AND pv.creado_en <= ?
        ${seller.sql}
    `,
  )
    .bind(range.fechaDesde, range.fechaHasta, ...seller.values)
    .first<DashboardPaymentsSummary>();

  return { total_recibido: row?.total_recibido ?? 0 };
}

export async function getPortfolioSummary(env: ApiEnv): Promise<DashboardPortfolioSummary> {
  const row = await env.DB.prepare(
    `
      SELECT
        COALESCE(SUM(CASE WHEN estado_credito != 'ANULADO' THEN saldo_pendiente ELSE 0 END), 0) AS saldo_pendiente_total,
        COUNT(CASE WHEN estado_credito = 'PENDIENTE' THEN 1 END) AS creditos_pendientes,
        COUNT(CASE WHEN estado_credito = 'PAGADO' THEN 1 END) AS creditos_pagados,
        COUNT(CASE WHEN estado_credito = 'ANULADO' THEN 1 END) AS creditos_anulados
      FROM creditos_clientes
    `,
  ).first<DashboardPortfolioSummary>();

  return {
    saldo_pendiente_total: row?.saldo_pendiente_total ?? 0,
    creditos_pendientes: row?.creditos_pendientes ?? 0,
    creditos_pagados: row?.creditos_pagados ?? 0,
    creditos_anulados: row?.creditos_anulados ?? 0,
  };
}

export async function getInventorySummary(env: ApiEnv): Promise<DashboardInventorySummary> {
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(*) AS variantes_total,
        COUNT(CASE WHEN estado = 'ACTIVA' THEN 1 END) AS variantes_activas,
        COALESCE(SUM(stock_actual), 0) AS stock_total,
        COUNT(CASE WHEN stock_actual <= 0 THEN 1 END) AS variantes_sin_stock,
        COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) AS variantes_bajo_stock
      FROM variantes_producto
    `,
  ).first<DashboardInventorySummary>();

  return {
    variantes_total: row?.variantes_total ?? 0,
    variantes_activas: row?.variantes_activas ?? 0,
    stock_total: row?.stock_total ?? 0,
    variantes_sin_stock: row?.variantes_sin_stock ?? 0,
    variantes_bajo_stock: row?.variantes_bajo_stock ?? 0,
  };
}

export async function getReturnsSummary(
  env: ApiEnv,
  range: DashboardDateRange,
): Promise<DashboardReturnsSummary> {
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(*) AS cantidad_total,
        COALESCE(SUM(total_devuelto), 0) AS total_devuelto
      FROM devoluciones_ventas
      WHERE estado_devolucion != 'ANULADA'
        AND creado_en >= ?
        AND creado_en <= ?
    `,
  )
    .bind(range.fechaDesde, range.fechaHasta)
    .first<DashboardReturnsSummary>();

  return {
    cantidad_total: row?.cantidad_total ?? 0,
    total_devuelto: row?.total_devuelto ?? 0,
  };
}

export async function getEntryLotsSummary(env: ApiEnv): Promise<DashboardEntryLotsSummary> {
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(CASE WHEN estado_lote = 'BORRADOR' THEN 1 END) AS lotes_borrador,
        COUNT(CASE WHEN estado_lote = 'CONFIRMADO' THEN 1 END) AS lotes_confirmados,
        COUNT(CASE WHEN estado_lote = 'ANULADO' THEN 1 END) AS lotes_anulados
      FROM lotes_entrada
    `,
  ).first<DashboardEntryLotsSummary>();

  return {
    lotes_borrador: row?.lotes_borrador ?? 0,
    lotes_confirmados: row?.lotes_confirmados ?? 0,
    lotes_anulados: row?.lotes_anulados ?? 0,
  };
}

export async function getAlertsSummary(env: ApiEnv): Promise<DashboardAlertsSummary> {
  const row = await env.DB.prepare(
    `
      SELECT
        (SELECT COUNT(*) FROM variantes_producto WHERE codigo_qr IS NULL OR TRIM(codigo_qr) = '') AS variantes_sin_qr,
        (SELECT COUNT(*) FROM variantes_producto WHERE imagen_variante IS NULL OR TRIM(imagen_variante) = '') AS variantes_sin_imagen,
        (SELECT COUNT(*) FROM productos WHERE imagen_principal IS NULL OR TRIM(imagen_principal) = '') AS productos_sin_imagen,
        (SELECT COUNT(*) FROM creditos_clientes WHERE estado_credito != 'ANULADO' AND saldo_pendiente > 0) AS creditos_con_saldo
    `,
  ).first<DashboardAlertsSummary>();

  return {
    variantes_sin_qr: row?.variantes_sin_qr ?? 0,
    variantes_sin_imagen: row?.variantes_sin_imagen ?? 0,
    productos_sin_imagen: row?.productos_sin_imagen ?? 0,
    creditos_con_saldo: row?.creditos_con_saldo ?? 0,
  };
}
