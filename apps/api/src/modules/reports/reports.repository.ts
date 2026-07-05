import type { ApiEnv } from '../../config/env';
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

type QueryValue = string | number;

function whereSql(where: string[]): string {
  return where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
}

export async function listSales(
  env: ApiEnv,
  filters: SalesReportFilters,
  forcedUserId?: string,
): Promise<SalesReportRow[]> {
  const where: string[] = [];
  const values: QueryValue[] = [];

  applySalesFilters(where, values, filters, forcedUserId);
  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT
        v.id_venta,
        v.numero_venta,
        v.id_cliente,
        c.nombre_completo AS cliente_nombre,
        v.id_usuario,
        u.nombre_completo AS usuario_nombre,
        v.tipo_venta,
        v.estado_venta,
        v.subtotal,
        v.descuento,
        v.total,
        v.valor_pagado_inicial,
        v.saldo_pendiente,
        COALESCE(v.fecha_venta, v.creado_en) AS creado_en
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
      ${whereSql(where)}
      ORDER BY COALESCE(v.fecha_venta, v.creado_en) DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<SalesReportRow>();

  return result.results ?? [];
}

function applySalesFilters(
  where: string[],
  values: QueryValue[],
  filters: SalesReportFilters,
  forcedUserId?: string,
): void {
  if (filters.fechaDesde) {
    where.push('COALESCE(v.fecha_venta, v.creado_en) >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('COALESCE(v.fecha_venta, v.creado_en) <= ?');
    values.push(filters.fechaHasta);
  }
  if (filters.tipoVenta) {
    where.push('v.tipo_venta = ?');
    values.push(filters.tipoVenta);
  }
  if (filters.estadoVenta) {
    where.push('v.estado_venta = ?');
    values.push(filters.estadoVenta);
  }
  if (filters.idCliente) {
    where.push('v.id_cliente = ?');
    values.push(filters.idCliente);
  }
  if (forcedUserId) {
    where.push('v.id_usuario = ?');
    values.push(forcedUserId);
  } else if (filters.idUsuario) {
    where.push('v.id_usuario = ?');
    values.push(filters.idUsuario);
  }
}

export async function countSales(
  env: ApiEnv,
  filters: SalesReportFilters,
  forcedUserId?: string,
): Promise<number> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applySalesFilters(where, values, filters, forcedUserId);

  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM ventas v
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function getSalesTotals(
  env: ApiEnv,
  filters: SalesReportFilters,
  forcedUserId?: string,
): Promise<SalesReportTotals> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applySalesFilters(where, values, filters, forcedUserId);
  const includeCancelled = filters.estadoVenta === 'ANULADA';

  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(CASE WHEN ${includeCancelled ? '1 = 1' : "v.estado_venta != 'ANULADA'"} THEN 1 END) AS cantidad_total,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "v.estado_venta != 'ANULADA'"} THEN v.total ELSE 0 END), 0) AS total_vendido,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "v.estado_venta != 'ANULADA'"} THEN v.subtotal ELSE 0 END), 0) AS total_bruto,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "v.estado_venta != 'ANULADA'"} THEN v.descuento ELSE 0 END), 0) AS total_descuento,
        COUNT(CASE WHEN v.estado_venta = 'ANULADA' THEN 1 END) AS ventas_anuladas
      FROM ventas v
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<SalesReportTotals>();

  return {
    cantidad_total: row?.cantidad_total ?? 0,
    total_vendido: row?.total_vendido ?? 0,
    total_bruto: row?.total_bruto ?? 0,
    total_descuento: row?.total_descuento ?? 0,
    ventas_anuladas: row?.ventas_anuladas ?? 0,
  };
}

function applyInventoryFilters(
  where: string[],
  values: QueryValue[],
  filters: InventoryReportFilters,
): void {
  if (filters.q) {
    where.push(
      '(p.nombre_producto LIKE ? OR v.codigo_qr LIKE ? OR v.talla LIKE ? OR v.color LIKE ?)',
    );
    const q = `%${filters.q}%`;
    values.push(q, q, q, q);
  }
  if (filters.idProducto) {
    where.push('v.id_producto = ?');
    values.push(filters.idProducto);
  }
  if (filters.idCategoria) {
    where.push('p.id_categoria = ?');
    values.push(filters.idCategoria);
  }
  if (filters.estadoVariante) {
    where.push('v.estado = ?');
    values.push(filters.estadoVariante);
  }
  if (filters.bajoStock !== undefined) {
    where.push(
      filters.bajoStock ? 'v.stock_actual <= v.stock_minimo' : 'v.stock_actual > v.stock_minimo',
    );
  }
  if (filters.sinStock !== undefined) {
    where.push(filters.sinStock ? 'v.stock_actual <= 0' : 'v.stock_actual > 0');
  }
}

export async function listInventory(
  env: ApiEnv,
  filters: InventoryReportFilters,
): Promise<InventoryReportRow[]> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyInventoryFilters(where, values, filters);
  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT
        v.id_variante,
        v.id_producto,
        p.nombre_producto,
        p.id_categoria,
        c.nombre_categoria,
        v.talla,
        v.color,
        v.codigo_qr,
        v.stock_actual,
        v.stock_minimo,
        v.estado
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${whereSql(where)}
      ORDER BY p.nombre_producto ASC, v.codigo_qr ASC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<InventoryReportRow>();

  return result.results ?? [];
}

export async function countInventory(
  env: ApiEnv,
  filters: InventoryReportFilters,
): Promise<number> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyInventoryFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function getInventoryTotals(
  env: ApiEnv,
  filters: InventoryReportFilters,
): Promise<InventoryReportTotals> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyInventoryFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS variantes_total, COALESCE(SUM(v.stock_actual), 0) AS stock_total
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<InventoryReportTotals>();

  return {
    variantes_total: row?.variantes_total ?? 0,
    stock_total: row?.stock_total ?? 0,
  };
}

function applyMovementFilters(
  where: string[],
  values: QueryValue[],
  filters: InventoryMovementReportFilters,
): void {
  if (filters.fechaDesde) {
    where.push('m.creado_en >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('m.creado_en <= ?');
    values.push(filters.fechaHasta);
  }
  if (filters.idVariante) {
    where.push('m.id_variante = ?');
    values.push(filters.idVariante);
  }
  if (filters.tipoMovimiento) {
    where.push('m.tipo_movimiento = ?');
    values.push(filters.tipoMovimiento);
  }
  if (filters.referenciaTipo) {
    where.push('m.referencia_tipo = ?');
    values.push(filters.referenciaTipo);
  }
  if (filters.referenciaId) {
    where.push('m.referencia_id = ?');
    values.push(filters.referenciaId);
  }
}

export async function listInventoryMovements(
  env: ApiEnv,
  filters: InventoryMovementReportFilters,
): Promise<InventoryMovementReportRow[]> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyMovementFilters(where, values, filters);
  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT
        m.id_movimiento,
        m.id_variante,
        v.codigo_qr,
        m.tipo_movimiento,
        m.cantidad,
        m.stock_antes,
        m.stock_despues,
        m.referencia_tipo,
        m.referencia_id,
        u.nombre_completo AS usuario_nombre,
        m.creado_en
      FROM movimientos_inventario m
      INNER JOIN variantes_producto v ON v.id_variante = m.id_variante
      LEFT JOIN usuarios u ON u.id_usuario = m.creado_por
      ${whereSql(where)}
      ORDER BY m.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<InventoryMovementReportRow>();

  return result.results ?? [];
}

export async function countInventoryMovements(
  env: ApiEnv,
  filters: InventoryMovementReportFilters,
): Promise<number> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyMovementFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM movimientos_inventario m
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function getInventoryMovementTotals(
  env: ApiEnv,
  filters: InventoryMovementReportFilters,
): Promise<InventoryMovementReportTotals> {
  return { cantidad_movimientos: await countInventoryMovements(env, filters) };
}

function applyPortfolioFilters(
  where: string[],
  values: QueryValue[],
  filters: PortfolioReportFilters,
): void {
  if (filters.idCliente) {
    where.push('cr.id_cliente = ?');
    values.push(filters.idCliente);
  }
  if (filters.estadoCredito) {
    where.push('cr.estado_credito = ?');
    values.push(filters.estadoCredito);
  }
  if (filters.origenCredito) {
    where.push('cr.origen_credito = ?');
    values.push(filters.origenCredito);
  }
}

export async function listPortfolio(
  env: ApiEnv,
  filters: PortfolioReportFilters,
): Promise<PortfolioReportRow[]> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyPortfolioFilters(where, values, filters);
  values.push(filters.limit, filters.offset);
  const result = await env.DB.prepare(
    `
      SELECT
        cr.id_credito,
        cr.id_cliente,
        c.nombre_completo AS cliente_nombre,
        cr.id_venta,
        cr.monto_inicial AS monto_original,
        cr.monto_abonado,
        cr.saldo_pendiente,
        cr.estado_credito,
        cr.origen_credito,
        cr.fecha_credito
      FROM creditos_clientes cr
      LEFT JOIN clientes c ON c.id_cliente = cr.id_cliente
      ${whereSql(where)}
      ORDER BY cr.fecha_credito DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<PortfolioReportRow>();

  return result.results ?? [];
}

export async function countPortfolio(
  env: ApiEnv,
  filters: PortfolioReportFilters,
): Promise<number> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyPortfolioFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM creditos_clientes cr
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function getPortfolioTotals(
  env: ApiEnv,
  filters: PortfolioReportFilters,
): Promise<PortfolioReportTotals> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyPortfolioFilters(where, values, filters);
  const includeCancelled = filters.estadoCredito === 'ANULADO';
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(*) AS cantidad_creditos,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "cr.estado_credito != 'ANULADO'"} THEN cr.saldo_pendiente ELSE 0 END), 0) AS saldo_activo,
        COALESCE(SUM(cr.monto_inicial), 0) AS monto_original
      FROM creditos_clientes cr
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<PortfolioReportTotals>();

  return {
    cantidad_creditos: row?.cantidad_creditos ?? 0,
    saldo_activo: row?.saldo_activo ?? 0,
    monto_original: row?.monto_original ?? 0,
  };
}

function applyReturnsFilters(
  where: string[],
  values: QueryValue[],
  filters: ReturnsReportFilters,
): void {
  if (filters.fechaDesde) {
    where.push('d.creado_en >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('d.creado_en <= ?');
    values.push(filters.fechaHasta);
  }
  if (filters.tipoVenta) {
    where.push('d.tipo_venta = ?');
    values.push(filters.tipoVenta);
  }
  if (filters.estadoDevolucion) {
    where.push('d.estado_devolucion = ?');
    values.push(filters.estadoDevolucion);
  }
  if (filters.idVenta) {
    where.push('d.id_venta = ?');
    values.push(filters.idVenta);
  }
}

export async function listReturns(
  env: ApiEnv,
  filters: ReturnsReportFilters,
): Promise<ReturnsReportRow[]> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyReturnsFilters(where, values, filters);
  values.push(filters.limit, filters.offset);
  const result = await env.DB.prepare(
    `
      SELECT
        d.id_devolucion,
        d.id_venta,
        v.numero_venta,
        d.tipo_venta,
        d.estado_devolucion,
        d.total_devuelto,
        d.impacto_credito,
        d.impacto_pago,
        COUNT(dd.id_detalle_devolucion) AS cantidad_detalles,
        d.creado_en
      FROM devoluciones_ventas d
      LEFT JOIN ventas v ON v.id_venta = d.id_venta
      LEFT JOIN detalle_devoluciones_ventas dd ON dd.id_devolucion = d.id_devolucion
      ${whereSql(where)}
      GROUP BY d.id_devolucion
      ORDER BY d.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<ReturnsReportRow>();

  return result.results ?? [];
}

export async function countReturns(env: ApiEnv, filters: ReturnsReportFilters): Promise<number> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyReturnsFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM devoluciones_ventas d
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function getReturnsTotals(
  env: ApiEnv,
  filters: ReturnsReportFilters,
): Promise<ReturnsReportTotals> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyReturnsFilters(where, values, filters);
  const includeCancelled = filters.estadoDevolucion === 'ANULADA';
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(CASE WHEN ${includeCancelled ? '1 = 1' : "d.estado_devolucion != 'ANULADA'"} THEN 1 END) AS cantidad_total,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "d.estado_devolucion != 'ANULADA'"} THEN d.total_devuelto ELSE 0 END), 0) AS total_devuelto,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "d.estado_devolucion != 'ANULADA'"} THEN d.impacto_credito ELSE 0 END), 0) AS impacto_credito,
        COALESCE(SUM(CASE WHEN ${includeCancelled ? '1 = 1' : "d.estado_devolucion != 'ANULADA'"} THEN d.impacto_pago ELSE 0 END), 0) AS impacto_pago
      FROM devoluciones_ventas d
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<ReturnsReportTotals>();

  return {
    cantidad_total: row?.cantidad_total ?? 0,
    total_devuelto: row?.total_devuelto ?? 0,
    impacto_credito: row?.impacto_credito ?? 0,
    impacto_pago: row?.impacto_pago ?? 0,
  };
}

function applyEntryLotsFilters(
  where: string[],
  values: QueryValue[],
  filters: EntryLotsReportFilters,
): void {
  if (filters.fechaDesde) {
    where.push('l.fecha_lote >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('l.fecha_lote <= ?');
    values.push(filters.fechaHasta);
  }
  if (filters.estadoLote) {
    where.push('l.estado_lote = ?');
    values.push(filters.estadoLote);
  }
  if (filters.idProveedor) {
    where.push('l.id_proveedor = ?');
    values.push(filters.idProveedor);
  }
}

export async function listEntryLots(
  env: ApiEnv,
  filters: EntryLotsReportFilters,
): Promise<EntryLotsReportRow[]> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyEntryLotsFilters(where, values, filters);
  values.push(filters.limit, filters.offset);
  const result = await env.DB.prepare(
    `
      SELECT
        l.id_lote,
        l.numero_lote,
        l.estado_lote,
        l.id_proveedor,
        p.nombre_proveedor,
        l.fecha_lote,
        l.total_compra,
        COUNT(d.id_detalle_lote) AS cantidad_detalles,
        l.creado_en
      FROM lotes_entrada l
      LEFT JOIN proveedores p ON p.id_proveedor = l.id_proveedor
      LEFT JOIN detalle_lotes_entrada d ON d.id_lote = l.id_lote
      ${whereSql(where)}
      GROUP BY l.id_lote
      ORDER BY l.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<EntryLotsReportRow>();

  return result.results ?? [];
}

export async function countEntryLots(
  env: ApiEnv,
  filters: EntryLotsReportFilters,
): Promise<number> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyEntryLotsFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM lotes_entrada l
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function getEntryLotsTotals(
  env: ApiEnv,
  filters: EntryLotsReportFilters,
): Promise<EntryLotsReportTotals> {
  const where: string[] = [];
  const values: QueryValue[] = [];
  applyEntryLotsFilters(where, values, filters);
  const row = await env.DB.prepare(
    `
      SELECT
        COUNT(DISTINCT l.id_lote) AS cantidad_lotes,
        COALESCE(SUM(DISTINCT l.total_compra), 0) AS total_compra,
        COUNT(d.id_detalle_lote) AS cantidad_detalles
      FROM lotes_entrada l
      LEFT JOIN detalle_lotes_entrada d ON d.id_lote = l.id_lote
      ${whereSql(where)}
    `,
  )
    .bind(...values)
    .first<EntryLotsReportTotals>();

  return {
    cantidad_lotes: row?.cantidad_lotes ?? 0,
    total_compra: row?.total_compra ?? 0,
    cantidad_detalles: row?.cantidad_detalles ?? 0,
  };
}
