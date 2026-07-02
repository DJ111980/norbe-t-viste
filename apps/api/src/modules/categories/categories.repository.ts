import type { ApiEnv } from '../../config/env';
import type {
  CategoryRecord,
  CategoryStatus,
  CreateCategoryInput,
  ListCategoriesFilters,
  UpdateCategoryInput,
} from './categories.types';

const CATEGORY_COLUMNS = `
  id_categoria,
  nombre_categoria,
  descripcion,
  estado,
  creado_en,
  actualizado_en,
  creado_por,
  actualizado_por,
  nombre_normalizado
`;

export async function listCategories(
  env: ApiEnv,
  filters: ListCategoriesFilters,
): Promise<CategoryRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.buscar) {
    where.push('(nombre_categoria LIKE ? OR descripcion LIKE ?)');
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue);
  }

  if (filters.estado) {
    where.push('estado = ?');
    values.push(filters.estado);
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${CATEGORY_COLUMNS}
      FROM categorias
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<CategoryRecord>();

  return result.results ?? [];
}

export async function findCategoryById(
  env: ApiEnv,
  idCategoria: string,
): Promise<CategoryRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${CATEGORY_COLUMNS}
      FROM categorias
      WHERE id_categoria = ?
      LIMIT 1
    `,
  )
    .bind(idCategoria)
    .first<CategoryRecord>();
}

export async function findCategoryByNormalizedName(
  env: ApiEnv,
  nombreNormalizado: string,
): Promise<CategoryRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${CATEGORY_COLUMNS}
      FROM categorias
      WHERE nombre_normalizado = ?
      LIMIT 1
    `,
  )
    .bind(nombreNormalizado)
    .first<CategoryRecord>();
}

export async function createCategory(
  env: ApiEnv,
  idCategoria: string,
  input: CreateCategoryInput,
  userId: string,
): Promise<CategoryRecord> {
  await env.DB.prepare(
    `
      INSERT INTO categorias (
        id_categoria,
        nombre_categoria,
        nombre_normalizado,
        descripcion,
        estado,
        creado_por,
        actualizado_por,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, 'ACTIVA', ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idCategoria,
      input.nombreCategoria,
      input.nombreNormalizado,
      input.descripcion,
      userId,
      userId,
    )
    .run();

  return (await findCategoryById(env, idCategoria)) as CategoryRecord;
}

export async function updateCategory(
  env: ApiEnv,
  idCategoria: string,
  input: UpdateCategoryInput,
  userId: string,
): Promise<CategoryRecord> {
  const assignments: string[] = [];
  const values: (string | null)[] = [];

  if (input.nombreCategoria !== undefined) {
    assignments.push('nombre_categoria = ?');
    values.push(input.nombreCategoria);
  }

  if (input.nombreNormalizado !== undefined) {
    assignments.push('nombre_normalizado = ?');
    values.push(input.nombreNormalizado);
  }

  if (input.descripcion !== undefined) {
    assignments.push('descripcion = ?');
    values.push(input.descripcion);
  }

  assignments.push('actualizado_por = ?', "actualizado_en = datetime('now')");
  values.push(userId);

  await env.DB.prepare(
    `
      UPDATE categorias
      SET ${assignments.join(', ')}
      WHERE id_categoria = ?
    `,
  )
    .bind(...values, idCategoria)
    .run();

  return (await findCategoryById(env, idCategoria)) as CategoryRecord;
}

export async function updateCategoryStatus(
  env: ApiEnv,
  idCategoria: string,
  estado: CategoryStatus,
  userId: string,
): Promise<CategoryRecord> {
  await env.DB.prepare(
    `
      UPDATE categorias
      SET estado = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
      WHERE id_categoria = ?
    `,
  )
    .bind(estado, userId, idCategoria)
    .run();

  return (await findCategoryById(env, idCategoria)) as CategoryRecord;
}
