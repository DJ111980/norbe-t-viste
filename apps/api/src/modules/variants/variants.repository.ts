import type { ApiEnv } from '../../config/env';
import type {
  CreateVariantInput,
  ListVariantsFilters,
  ProductForVariant,
  UpdateVariantInput,
  VariantRecord,
  VariantStatus,
} from './variants.types';

const VARIANT_COLUMNS = `
  v.id_variante,
  v.id_producto,
  v.sku,
  v.codigo_qr,
  v.ruta_qr,
  v.talla,
  v.color,
  v.talla_normalizada,
  v.color_normalizado,
  v.precio_compra,
  v.precio_venta,
  v.stock_actual,
  v.stock_minimo,
  v.imagen_variante,
  v.mostrar_en_catalogo,
  v.estado,
  v.creado_en,
  v.actualizado_en,
  v.creado_por,
  v.actualizado_por,
  p.nombre_producto,
  p.estado AS estado_producto
`;

export async function listVariants(
  env: ApiEnv,
  filters: ListVariantsFilters,
): Promise<VariantRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.buscar) {
    where.push(
      '(p.nombre_producto LIKE ? OR v.sku LIKE ? OR v.codigo_qr LIKE ? OR v.talla LIKE ? OR v.color LIKE ?)',
    );
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }
  if (filters.estado) {
    where.push('v.estado = ?');
    values.push(filters.estado);
  }
  if (filters.producto) {
    where.push('v.id_producto = ?');
    values.push(filters.producto);
  }
  if (filters.talla) {
    where.push('v.talla_normalizada = ?');
    values.push(filters.talla.trim().toLowerCase().replace(/\s+/g, ' '));
  }
  if (filters.color) {
    where.push('v.color_normalizado = ?');
    values.push(filters.color.trim().toLowerCase().replace(/\s+/g, ' '));
  }
  if (filters.codigoQr) {
    where.push('v.codigo_qr = ?');
    values.push(filters.codigoQr);
  }
  if (filters.sku) {
    where.push('v.sku = ?');
    values.push(filters.sku);
  }
  if (filters.stockBajo !== undefined) {
    where.push(
      filters.stockBajo ? 'v.stock_actual <= v.stock_minimo' : 'v.stock_actual > v.stock_minimo',
    );
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY v.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<VariantRecord>();

  return result.results ?? [];
}

export async function findVariantById(
  env: ApiEnv,
  idVariante: string,
): Promise<VariantRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.id_variante = ?
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<VariantRecord>();
}

export async function findVariantByQr(
  env: ApiEnv,
  codigoQr: string,
): Promise<VariantRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.codigo_qr = ?
      LIMIT 1
    `,
  )
    .bind(codigoQr)
    .first<VariantRecord>();
}

export async function findProductForVariant(
  env: ApiEnv,
  idProducto: string,
): Promise<ProductForVariant | null> {
  return env.DB.prepare(
    `
      SELECT id_producto, estado
      FROM productos
      WHERE id_producto = ?
      LIMIT 1
    `,
  )
    .bind(idProducto)
    .first<ProductForVariant>();
}

export async function findVariantByCombination(
  env: ApiEnv,
  idProducto: string,
  tallaNormalizada: string,
  colorNormalizado: string,
): Promise<VariantRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.id_producto = ?
        AND v.talla_normalizada = ?
        AND v.color_normalizado = ?
      LIMIT 1
    `,
  )
    .bind(idProducto, tallaNormalizada, colorNormalizado)
    .first<VariantRecord>();
}

export async function findVariantBySku(env: ApiEnv, sku: string): Promise<VariantRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${VARIANT_COLUMNS}
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.sku = ?
      LIMIT 1
    `,
  )
    .bind(sku)
    .first<VariantRecord>();
}

export async function countVariants(env: ApiEnv): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM variantes_producto').first<{
    total: number;
  }>();
  return row?.total ?? 0;
}

export async function createVariant(
  env: ApiEnv,
  idVariante: string,
  idProducto: string,
  input: CreateVariantInput,
  sku: string,
  codigoQr: string,
  userId: string,
): Promise<VariantRecord> {
  await env.DB.prepare(
    `
      INSERT INTO variantes_producto (
        id_variante,
        id_producto,
        sku,
        codigo_qr,
        talla,
        color,
        talla_normalizada,
        color_normalizado,
        precio_compra,
        precio_venta,
        stock_actual,
        stock_minimo,
        estado,
        creado_por,
        actualizado_por,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVA', ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idVariante,
      idProducto,
      sku,
      codigoQr,
      input.talla,
      input.color,
      input.tallaNormalizada,
      input.colorNormalizado,
      input.precioCompraReferencia,
      input.precioVenta,
      input.stockMinimo,
      userId,
      userId,
    )
    .run();

  return (await findVariantById(env, idVariante)) as VariantRecord;
}

export async function updateVariant(
  env: ApiEnv,
  idVariante: string,
  input: UpdateVariantInput,
  userId: string,
): Promise<VariantRecord> {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.talla !== undefined) {
    assignments.push('talla = ?');
    values.push(input.talla);
  }
  if (input.color !== undefined) {
    assignments.push('color = ?');
    values.push(input.color);
  }
  if (input.tallaNormalizada !== undefined) {
    assignments.push('talla_normalizada = ?');
    values.push(input.tallaNormalizada);
  }
  if (input.colorNormalizado !== undefined) {
    assignments.push('color_normalizado = ?');
    values.push(input.colorNormalizado);
  }
  if (input.sku !== undefined) {
    assignments.push('sku = ?');
    values.push(input.sku);
  }
  if (input.precioVenta !== undefined) {
    assignments.push('precio_venta = ?');
    values.push(input.precioVenta);
  }
  if (input.precioCompraReferencia !== undefined) {
    assignments.push('precio_compra = ?');
    values.push(input.precioCompraReferencia);
  }
  if (input.stockMinimo !== undefined) {
    assignments.push('stock_minimo = ?');
    values.push(input.stockMinimo);
  }

  assignments.push('actualizado_por = ?', "actualizado_en = datetime('now')");
  values.push(userId);

  await env.DB.prepare(
    `
      UPDATE variantes_producto
      SET ${assignments.join(', ')}
      WHERE id_variante = ?
    `,
  )
    .bind(...values, idVariante)
    .run();

  return (await findVariantById(env, idVariante)) as VariantRecord;
}

export async function updateVariantStatus(
  env: ApiEnv,
  idVariante: string,
  estado: VariantStatus,
  userId: string,
): Promise<VariantRecord> {
  await env.DB.prepare(
    `
      UPDATE variantes_producto
      SET estado = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
      WHERE id_variante = ?
    `,
  )
    .bind(estado, userId, idVariante)
    .run();

  return (await findVariantById(env, idVariante)) as VariantRecord;
}
