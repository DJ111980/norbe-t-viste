import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicCategory } from './categories.mapper';
import * as categoriesRepository from './categories.repository';
import type {
  CategoryRecord,
  CreateCategoryInput,
  ListCategoriesFilters,
  PublicCategory,
  UpdateCategoryInput,
  UpdateCategoryStatusInput,
} from './categories.types';

function createCategoryId(): string {
  return `cat_${crypto.randomUUID()}`;
}

async function ensureCategoryExists(env: ApiEnv, idCategoria: string): Promise<CategoryRecord> {
  const category = await categoriesRepository.findCategoryById(env, idCategoria);

  if (!category) {
    throw new ApiError('CATEGORY_NOT_FOUND', 'La categoria no existe.', 404);
  }

  return category;
}

async function ensureNormalizedNameIsAvailable(
  env: ApiEnv,
  nombreNormalizado: string | undefined,
  currentCategoryId?: string,
): Promise<void> {
  if (!nombreNormalizado) {
    return;
  }

  const existingCategory = await categoriesRepository.findCategoryByNormalizedName(
    env,
    nombreNormalizado,
  );

  if (existingCategory && existingCategory.id_categoria !== currentCategoryId) {
    // nombre_normalizado evita duplicar categorias por diferencias de mayusculas
    // o espacios. La restriccion acompana al indice unico parcial de D1.
    throw new ApiError(
      'CATEGORY_NAME_ALREADY_EXISTS',
      'Ya existe una categoria con ese nombre.',
      409,
    );
  }
}

function canReadCategory(auth: AuthContext, category: CategoryRecord): boolean {
  // Categorias conserva ACTIVA/INACTIVA porque asi esta modelada la tabla.
  // VENDEDOR solo ve categorias activas para no usar catalogo desactivado.
  return auth.user.rol === 'ADMINISTRADOR' || category.estado === 'ACTIVA';
}

export async function listCategories(
  env: ApiEnv,
  auth: AuthContext,
  filters: ListCategoriesFilters,
): Promise<PublicCategory[]> {
  const effectiveFilters =
    auth.user.rol === 'VENDEDOR'
      ? {
          ...filters,
          estado: 'ACTIVA' as const,
        }
      : filters;

  const categories = await categoriesRepository.listCategories(env, effectiveFilters);

  return categories.map(toPublicCategory);
}

export async function getCategory(
  env: ApiEnv,
  auth: AuthContext,
  idCategoria: string,
): Promise<PublicCategory> {
  const category = await ensureCategoryExists(env, idCategoria);

  if (!canReadCategory(auth, category)) {
    throw new ApiError('CATEGORY_NOT_FOUND', 'La categoria no existe.', 404);
  }

  return toPublicCategory(category);
}

export async function createCategory(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateCategoryInput,
): Promise<PublicCategory> {
  await ensureNormalizedNameIsAvailable(env, input.nombreNormalizado);

  return toPublicCategory(
    await categoriesRepository.createCategory(env, createCategoryId(), input, auth.user.id_usuario),
  );
}

export async function updateCategory(
  env: ApiEnv,
  auth: AuthContext,
  idCategoria: string,
  input: UpdateCategoryInput,
): Promise<PublicCategory> {
  await ensureCategoryExists(env, idCategoria);
  await ensureNormalizedNameIsAvailable(env, input.nombreNormalizado, idCategoria);

  return toPublicCategory(
    await categoriesRepository.updateCategory(env, idCategoria, input, auth.user.id_usuario),
  );
}

export async function updateCategoryStatus(
  env: ApiEnv,
  auth: AuthContext,
  idCategoria: string,
  input: UpdateCategoryStatusInput,
): Promise<PublicCategory> {
  await ensureCategoryExists(env, idCategoria);

  // No se eliminan categorias fisicamente: productos futuros pueden depender de
  // ellas. Esta ruta solo cambia estado; la logica de productos vendra despues.
  return toPublicCategory(
    await categoriesRepository.updateCategoryStatus(
      env,
      idCategoria,
      input.estado,
      auth.user.id_usuario,
    ),
  );
}
