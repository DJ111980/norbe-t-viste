import type { ApiEnv } from '../../config/env';
import type {
  CategoryForProduct,
  CreateProductInput,
  ListProductsFilters,
  ProductRecord,
  ProductStatus,
  UpdateProductInput,
} from './products.types';

const PRODUCT_COLUMNS = `
  p.id_producto,
  p.id_categoria,
  p.nombre_producto,
  p.descripcion,
  p.marca,
  p.referencia,
  p.imagen_principal,
  p.mostrar_en_catalogo,
  p.estado,
  p.creado_en,
  p.actualizado_en,
  p.creado_por,
  p.actualizado_por,
  p.nombre_normalizado,
  c.nombre_categoria AS categoria_nombre,
  c.estado AS categoria_estado
`;

export async function listProducts(
  env: ApiEnv,
  filters: ListProductsFilters,
): Promise<ProductRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.buscar) {
    where.push(
      '(p.nombre_producto LIKE ? OR p.descripcion LIKE ? OR p.marca LIKE ? OR p.referencia LIKE ?)',
    );
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (filters.estado) {
    where.push('p.estado = ?');
    values.push(filters.estado);
  }

  if (filters.categoria) {
    where.push('p.id_categoria = ?');
    values.push(filters.categoria);
  }

  if (filters.visibleCatalogo !== undefined) {
    where.push('p.mostrar_en_catalogo = ?');
    values.push(filters.visibleCatalogo ? 1 : 0);
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${PRODUCT_COLUMNS}
      FROM productos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<ProductRecord>();

  return result.results ?? [];
}

export async function findProductById(
  env: ApiEnv,
  idProducto: string,
): Promise<ProductRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${PRODUCT_COLUMNS}
      FROM productos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      WHERE p.id_producto = ?
      LIMIT 1
    `,
  )
    .bind(idProducto)
    .first<ProductRecord>();
}

export async function findProductByNormalizedName(
  env: ApiEnv,
  nombreNormalizado: string,
): Promise<ProductRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${PRODUCT_COLUMNS}
      FROM productos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      WHERE p.nombre_normalizado = ?
      LIMIT 1
    `,
  )
    .bind(nombreNormalizado)
    .first<ProductRecord>();
}

export async function findCategoryForProduct(
  env: ApiEnv,
  idCategoria: string,
): Promise<CategoryForProduct | null> {
  return env.DB.prepare(
    `
      SELECT id_categoria, estado
      FROM categorias
      WHERE id_categoria = ?
      LIMIT 1
    `,
  )
    .bind(idCategoria)
    .first<CategoryForProduct>();
}

export async function createProduct(
  env: ApiEnv,
  idProducto: string,
  input: CreateProductInput,
  userId: string,
): Promise<ProductRecord> {
  await env.DB.prepare(
    `
      INSERT INTO productos (
        id_producto,
        id_categoria,
        nombre_producto,
        nombre_normalizado,
        descripcion,
        marca,
        referencia,
        mostrar_en_catalogo,
        estado,
        creado_por,
        actualizado_por,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idProducto,
      input.idCategoria,
      input.nombreProducto,
      input.nombreNormalizado,
      input.descripcion,
      input.marca,
      input.referencia,
      input.visibleCatalogo ? 1 : 0,
      userId,
      userId,
    )
    .run();

  return (await findProductById(env, idProducto)) as ProductRecord;
}

export async function updateProduct(
  env: ApiEnv,
  idProducto: string,
  input: UpdateProductInput,
  userId: string,
): Promise<ProductRecord> {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.nombreProducto !== undefined) {
    assignments.push('nombre_producto = ?');
    values.push(input.nombreProducto);
  }

  if (input.nombreNormalizado !== undefined) {
    assignments.push('nombre_normalizado = ?');
    values.push(input.nombreNormalizado);
  }

  if (input.idCategoria !== undefined) {
    assignments.push('id_categoria = ?');
    values.push(input.idCategoria);
  }

  if (input.descripcion !== undefined) {
    assignments.push('descripcion = ?');
    values.push(input.descripcion);
  }

  if (input.marca !== undefined) {
    assignments.push('marca = ?');
    values.push(input.marca);
  }

  if (input.referencia !== undefined) {
    assignments.push('referencia = ?');
    values.push(input.referencia);
  }

  if (input.visibleCatalogo !== undefined) {
    assignments.push('mostrar_en_catalogo = ?');
    values.push(input.visibleCatalogo ? 1 : 0);
  }

  assignments.push('actualizado_por = ?', "actualizado_en = datetime('now')");
  values.push(userId);

  await env.DB.prepare(
    `
      UPDATE productos
      SET ${assignments.join(', ')}
      WHERE id_producto = ?
    `,
  )
    .bind(...values, idProducto)
    .run();

  return (await findProductById(env, idProducto)) as ProductRecord;
}

export async function updateProductStatus(
  env: ApiEnv,
  idProducto: string,
  estado: ProductStatus,
  userId: string,
): Promise<ProductRecord> {
  await env.DB.prepare(
    `
      UPDATE productos
      SET estado = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
      WHERE id_producto = ?
    `,
  )
    .bind(estado, userId, idProducto)
    .run();

  return (await findProductById(env, idProducto)) as ProductRecord;
}
