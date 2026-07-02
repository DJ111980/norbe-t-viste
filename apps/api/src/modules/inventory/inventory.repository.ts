import type { ApiEnv } from '../../config/env';
import type {
  InventoryMovementRecord,
  InventoryVariantRecord,
  ListInventoryMovementsFilters,
  ListInventoryVariantsFilters,
} from './inventory.types';

const INVENTORY_VARIANT_COLUMNS = `
  v.id_variante,
  v.id_producto,
  v.sku,
  v.codigo_qr,
  v.talla,
  v.color,
  v.precio_compra,
  v.precio_venta,
  v.stock_actual,
  v.stock_minimo,
  v.estado,
  p.nombre_producto,
  p.estado AS estado_producto,
  p.id_categoria,
  c.nombre_categoria
`;

const MOVEMENT_COLUMNS = `
  m.id_movimiento,
  m.id_variante,
  m.tipo_movimiento,
  m.cantidad,
  m.stock_antes,
  m.stock_despues,
  m.motivo,
  m.referencia_tipo,
  m.referencia_id,
  m.creado_por,
  m.creado_en,
  v.sku,
  v.codigo_qr,
  v.talla,
  v.color,
  p.id_producto,
  p.nombre_producto
`;

function applySellerVisibility(where: string[], onlyVisibleToSeller: boolean): void {
  if (onlyVisibleToSeller) {
    where.push("v.estado = 'ACTIVA'", "p.estado = 'ACTIVO'");
  }
}

export async function listInventoryVariants(
  env: ApiEnv,
  filters: ListInventoryVariantsFilters,
  onlyVisibleToSeller: boolean,
): Promise<InventoryVariantRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  applySellerVisibility(where, onlyVisibleToSeller);

  if (filters.buscar) {
    where.push(
      '(p.nombre_producto LIKE ? OR v.sku LIKE ? OR v.codigo_qr LIKE ? OR v.talla LIKE ? OR v.color LIKE ?)',
    );
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }
  if (filters.estado && !onlyVisibleToSeller) {
    where.push('v.estado = ?');
    values.push(filters.estado);
  }
  if (filters.producto) {
    where.push('v.id_producto = ?');
    values.push(filters.producto);
  }
  if (filters.categoria) {
    where.push('p.id_categoria = ?');
    values.push(filters.categoria);
  }
  if (filters.talla) {
    where.push('v.talla_normalizada = ?');
    values.push(filters.talla.trim().toLowerCase().replace(/\s+/g, ' '));
  }
  if (filters.color) {
    where.push('v.color_normalizado = ?');
    values.push(filters.color.trim().toLowerCase().replace(/\s+/g, ' '));
  }
  if (filters.sku) {
    where.push('v.sku = ?');
    values.push(filters.sku);
  }
  if (filters.codigoQr) {
    where.push('v.codigo_qr = ?');
    values.push(filters.codigoQr);
  }
  if (filters.stockBajo !== undefined) {
    where.push(
      filters.stockBajo ? 'v.stock_actual <= v.stock_minimo' : 'v.stock_actual > v.stock_minimo',
    );
  }
  if (filters.sinStock !== undefined) {
    where.push(filters.sinStock ? 'v.stock_actual <= 0' : 'v.stock_actual > 0');
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${INVENTORY_VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.nombre_producto ASC, v.talla ASC, v.color ASC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<InventoryVariantRecord>();

  return result.results ?? [];
}

export async function findInventoryVariantById(
  env: ApiEnv,
  idVariante: string,
  onlyVisibleToSeller: boolean,
): Promise<InventoryVariantRecord | null> {
  const where = ['v.id_variante = ?'];
  applySellerVisibility(where, onlyVisibleToSeller);

  return env.DB.prepare(
    `
      SELECT ${INVENTORY_VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      WHERE ${where.join(' AND ')}
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<InventoryVariantRecord>();
}

export async function listInventoryMovements(
  env: ApiEnv,
  filters: ListInventoryMovementsFilters,
): Promise<InventoryMovementRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.variante) {
    where.push('m.id_variante = ?');
    values.push(filters.variante);
  }
  if (filters.producto) {
    where.push('v.id_producto = ?');
    values.push(filters.producto);
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
  if (filters.fechaDesde) {
    where.push('m.creado_en >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('m.creado_en <= ?');
    values.push(filters.fechaHasta);
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${MOVEMENT_COLUMNS}
      FROM movimientos_inventario m
      INNER JOIN variantes_producto v ON v.id_variante = m.id_variante
      INNER JOIN productos p ON p.id_producto = v.id_producto
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<InventoryMovementRecord>();

  return result.results ?? [];
}
