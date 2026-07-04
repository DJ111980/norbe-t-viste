import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  CategoryRecord,
  CategoryStatus,
  CreateCategoryInput,
  ListCategoriesFilters,
  UpdateCategoryInput,
} from './categories.types';

const mocks = vi.hoisted(() => ({
  categories: new Map<string, CategoryRecord>(),
  normalizedNameIndex: new Map<string, string>(),
  lastUpdatedBy: '',
  lastFilters: null as ListCategoriesFilters | null,
}));

vi.mock('./categories.repository', () => ({
  listCategories: vi.fn(async (_env: ApiEnv, filters: ListCategoriesFilters) => {
    mocks.lastFilters = filters;
    return [...mocks.categories.values()].filter(
      (category) => !filters.estado || category.estado === filters.estado,
    );
  }),
  findCategoryById: vi.fn(
    async (_env: ApiEnv, idCategoria: string) => mocks.categories.get(idCategoria) ?? null,
  ),
  findCategoryByNormalizedName: vi.fn(async (_env: ApiEnv, nombreNormalizado: string) => {
    const idCategoria = mocks.normalizedNameIndex.get(nombreNormalizado);
    return idCategoria ? (mocks.categories.get(idCategoria) ?? null) : null;
  }),
  createCategory: vi.fn(
    async (_env: ApiEnv, idCategoria: string, input: CreateCategoryInput, userId: string) => {
      const category = createCategoryRecord({
        id_categoria: idCategoria,
        nombre_categoria: input.nombreCategoria,
        nombre_normalizado: input.nombreNormalizado,
        descripcion: input.descripcion,
        estado: 'ACTIVA',
        creado_por: userId,
        actualizado_por: userId,
      });
      mocks.categories.set(idCategoria, category);
      mocks.normalizedNameIndex.set(input.nombreNormalizado, idCategoria);
      return category;
    },
  ),
  updateCategory: vi.fn(
    async (_env: ApiEnv, idCategoria: string, input: UpdateCategoryInput, userId: string) => {
      const category = mocks.categories.get(idCategoria);
      if (!category) throw new Error('missing mock category');
      if (input.nombreCategoria !== undefined) category.nombre_categoria = input.nombreCategoria;
      if (input.nombreNormalizado !== undefined) {
        if (category.nombre_normalizado) {
          mocks.normalizedNameIndex.delete(category.nombre_normalizado);
        }
        category.nombre_normalizado = input.nombreNormalizado;
        mocks.normalizedNameIndex.set(input.nombreNormalizado, idCategoria);
      }
      if (input.descripcion !== undefined) category.descripcion = input.descripcion;
      category.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return category;
    },
  ),
  updateCategoryStatus: vi.fn(
    async (_env: ApiEnv, idCategoria: string, estado: CategoryStatus, userId: string) => {
      const category = mocks.categories.get(idCategoria);
      if (!category) throw new Error('missing mock category');
      category.estado = estado;
      category.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return category;
    },
  ),
}));

const { createCategory, getCategory, listCategories, updateCategory, updateCategoryStatus } =
  await import('./categories.service');

const env = {} as ApiEnv;
const adminAuth = createAuth('ADMINISTRADOR');
const sellerAuth = createAuth('VENDEDOR');

function createAuth(rol: 'ADMINISTRADOR' | 'VENDEDOR'): AuthContext {
  return {
    user: {
      id_usuario: rol === 'ADMINISTRADOR' ? 'usr_admin' : 'usr_vendedor',
      nombre_completo: rol,
      nombre_usuario: rol.toLowerCase(),
      correo: `${rol.toLowerCase()}@norbe.test`,
      contrasena_hash: 'hash',
      rol,
      estado: 'ACTIVO',
      ultimo_acceso: null,
      creado_en: '2026-01-01 00:00:00',
      actualizado_en: '2026-01-01 00:00:00',
      debe_cambiar_contrasena: 0,
      contrasena_actualizada_en: null,
      creado_por: null,
    },
  };
}

function createCategoryRecord(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id_categoria: 'cat_1',
    nombre_categoria: 'Blusas',
    descripcion: null,
    estado: 'ACTIVA',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: null,
    actualizado_por: null,
    nombre_normalizado: 'blusas',
    ...overrides,
  };
}

function addMockCategory(category: CategoryRecord): void {
  mocks.categories.set(category.id_categoria, category);
  if (category.nombre_normalizado) {
    mocks.normalizedNameIndex.set(category.nombre_normalizado, category.id_categoria);
  }
}

describe('categories service', () => {
  beforeEach(() => {
    mocks.categories = new Map();
    mocks.normalizedNameIndex = new Map();
    mocks.lastUpdatedBy = '';
    mocks.lastFilters = null;
  });

  it('crear categoria rechaza nombre normalizado duplicado', async () => {
    addMockCategory(createCategoryRecord({ id_categoria: 'cat_1', nombre_normalizado: 'blusas' }));

    await expect(
      createCategory(env, adminAuth, {
        nombreCategoria: 'Blusas',
        nombreNormalizado: 'blusas',
        descripcion: null,
      }),
    ).rejects.toMatchObject({
      code: 'CATEGORY_NAME_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('crear categoria guarda estado ACTIVA y auditoria', async () => {
    const category = await createCategory(env, adminAuth, {
      nombreCategoria: 'Blusas',
      nombreNormalizado: 'blusas',
      descripcion: null,
    });

    expect(category.estado).toBe('ACTIVA');
    expect(category.creadoPor).toBe('usr_admin');
    expect(category.actualizadoPor).toBe('usr_admin');
  });

  it('editar categoria rechaza nombre duplicado contra otra categoria', async () => {
    addMockCategory(createCategoryRecord({ id_categoria: 'cat_1', nombre_normalizado: 'blusas' }));
    addMockCategory(
      createCategoryRecord({ id_categoria: 'cat_2', nombre_normalizado: 'vestidos' }),
    );

    await expect(
      updateCategory(env, adminAuth, 'cat_1', {
        nombreCategoria: 'Vestidos',
        nombreNormalizado: 'vestidos',
      }),
    ).rejects.toMatchObject({
      code: 'CATEGORY_NAME_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('administrador puede cambiar estado a INACTIVA y ACTIVA', async () => {
    addMockCategory(createCategoryRecord({ id_categoria: 'cat_1' }));

    const inactive = await updateCategoryStatus(env, adminAuth, 'cat_1', { estado: 'INACTIVA' });
    const active = await updateCategoryStatus(env, adminAuth, 'cat_1', { estado: 'ACTIVA' });

    expect(inactive.estado).toBe('INACTIVA');
    expect(active.estado).toBe('ACTIVA');
    expect(mocks.lastUpdatedBy).toBe('usr_admin');
  });

  it('listado aplica filtros basicos', async () => {
    await listCategories(env, adminAuth, {
      buscar: 'blusa',
      estado: 'INACTIVA',
      limit: 50,
      offset: 0,
    });

    expect(mocks.lastFilters).toEqual({
      buscar: 'blusa',
      estado: 'INACTIVA',
      limit: 50,
      offset: 0,
    });
  });

  it('vendedor ve solo categorias activas', async () => {
    addMockCategory(createCategoryRecord({ id_categoria: 'cat_1', estado: 'ACTIVA' }));
    addMockCategory(createCategoryRecord({ id_categoria: 'cat_2', estado: 'INACTIVA' }));

    const categories = await listCategories(env, sellerAuth, {
      limit: 50,
      offset: 0,
    });

    expect(categories).toHaveLength(1);
    expect(mocks.lastFilters?.estado).toBe('ACTIVA');
    await expect(getCategory(env, sellerAuth, 'cat_2')).rejects.toMatchObject({
      code: 'CATEGORY_NOT_FOUND',
      status: 404,
    });
  });
});
