import type { ApiEnv } from '../../config/env';
import type {
  InventoryMovementRecord,
  InventoryVariantRecord,
  InitialInventoryMovementInput,
  ListInventoryMovementsFilters,
  ListInventoryVariantsFilters,
  ManualInventoryAdjustmentMovementInput,
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

export async function countMovementsByVariant(env: ApiEnv, idVariante: string): Promise<number> {
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM movimientos_inventario
      WHERE id_variante = ?
    `,
  )
    .bind(idVariante)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

export async function registerInitialInventory(
  env: ApiEnv,
  userId: string,
  movements: InitialInventoryMovementInput[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const movement of movements) {
    statements.push(
      env.DB.prepare(
        `
          UPDATE variantes_producto
          SET stock_actual = ?,
              actualizado_en = datetime('now')
          WHERE id_variante = ?
            AND stock_actual = 0
            AND NOT EXISTS (
              SELECT 1
              FROM movimientos_inventario
              WHERE id_variante = ?
            )
        `,
      ).bind(movement.stockDespues, movement.idVariante, movement.idVariante),
    );

    statements.push(
      env.DB.prepare(
        `
          INSERT INTO movimientos_inventario (
            id_movimiento,
            id_variante,
            creado_por,
            tipo_movimiento,
            cantidad,
            stock_antes,
            stock_despues,
            motivo,
            referencia_tipo,
            referencia_id,
            creado_en
          )
          SELECT ?, ?, ?, 'INVENTARIO_INICIAL', ?, ?, ?, ?, 'INVENTARIO_INICIAL', ?, datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM variantes_producto
            WHERE id_variante = ?
              AND stock_actual = ?
          )
          AND NOT EXISTS (
            SELECT 1
            FROM movimientos_inventario
            WHERE id_variante = ?
          )
        `,
      ).bind(
        movement.idMovimiento,
        movement.idVariante,
        userId,
        movement.cantidad,
        movement.stockAntes,
        movement.stockDespues,
        movement.motivo,
        movement.idMovimiento,
        movement.idVariante,
        movement.stockDespues,
        movement.idVariante,
      ),
    );
  }

  // Batch agrupa stock y movimientos. Cada sentencia tambien valida stock=0 y
  // ausencia de historial para reducir el riesgo de inventario inicial duplicado.
  await env.DB.batch(statements);
}

export async function registerManualInventoryAdjustment(
  env: ApiEnv,
  userId: string,
  movement: ManualInventoryAdjustmentMovementInput,
): Promise<void> {
  const operator = movement.tipoAjuste === 'AJUSTE_POSITIVO' ? '+' : '-';
  const stockGuard = movement.tipoAjuste === 'AJUSTE_NEGATIVO' ? 'AND stock_actual >= ?' : '';
  const stockGuardValues = movement.tipoAjuste === 'AJUSTE_NEGATIVO' ? [movement.cantidad] : [];

  const statements = [
    env.DB.prepare(
      `
        UPDATE variantes_producto
        SET stock_actual = stock_actual ${operator} ?,
            actualizado_en = datetime('now')
        WHERE id_variante = ?
          AND stock_actual = ?
          ${stockGuard}
      `,
    ).bind(movement.cantidad, movement.idVariante, movement.stockAntes, ...stockGuardValues),
    env.DB.prepare(
      `
        INSERT INTO movimientos_inventario (
          id_movimiento,
          id_variante,
          creado_por,
          tipo_movimiento,
          cantidad,
          stock_antes,
          stock_despues,
          motivo,
          referencia_tipo,
          referencia_id,
          creado_en
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'AJUSTE_INVENTARIO', ?, datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM variantes_producto
          WHERE id_variante = ?
            AND stock_actual = ?
        )
      `,
    ).bind(
      movement.idMovimiento,
      movement.idVariante,
      userId,
      movement.tipoAjuste,
      movement.cantidad,
      movement.stockAntes,
      movement.stockDespues,
      movement.motivo,
      movement.idMovimiento,
      movement.idVariante,
      movement.stockDespues,
    ),
  ];

  // Ajustes son operaciones controladas: stock y movimiento viajan juntos en
  // batch. El negativo ademas exige stock suficiente para evitar valores menores a cero.
  await env.DB.batch(statements);
}

export async function movementExists(env: ApiEnv, idMovimiento: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `
      SELECT 1 AS existe
      FROM movimientos_inventario
      WHERE id_movimiento = ?
      LIMIT 1
    `,
  )
    .bind(idMovimiento)
    .first<{ existe: number }>();

  return Boolean(row?.existe);
}
