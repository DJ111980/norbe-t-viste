import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  CategoryForProduct,
  CreateProductInput,
  ListProductsFilters,
  ProductRecord,
  ProductStatus,
  UpdateProductInput,
} from './products.types';

const mocks = vi.hoisted(() => ({
  products: new Map<string, ProductRecord>(),
  normalizedNameIndex: new Map<string, string>(),
  categories: new Map<string, CategoryForProduct>(),
  lastFilters: null as ListProductsFilters | null,
  lastUpdatedBy: '',
}));

vi.mock('./products.repository', () => ({
  listProducts: vi.fn(async (_env: ApiEnv, filters: ListProductsFilters) => {
    mocks.lastFilters = filters;
    return [...mocks.products.values()].filter(
      (product) => !filters.estado || product.estado === filters.estado,
    );
  }),
  findProductById: vi.fn(
    async (_env: ApiEnv, idProducto: string) => mocks.products.get(idProducto) ?? null,
  ),
  findProductByNormalizedName: vi.fn(async (_env: ApiEnv, nombreNormalizado: string) => {
    const idProducto = mocks.normalizedNameIndex.get(nombreNormalizado);
    return idProducto ? (mocks.products.get(idProducto) ?? null) : null;
  }),
  findCategoryForProduct: vi.fn(
    async (_env: ApiEnv, idCategoria: string) => mocks.categories.get(idCategoria) ?? null,
  ),
  createProduct: vi.fn(
    async (_env: ApiEnv, idProducto: string, input: CreateProductInput, userId: string) => {
      const product = createProductRecord({
        id_producto: idProducto,
        id_categoria: input.idCategoria,
        nombre_producto: input.nombreProducto,
        nombre_normalizado: input.nombreNormalizado,
        descripcion: input.descripcion,
        marca: input.marca,
        referencia: input.referencia,
        mostrar_en_catalogo: input.visibleCatalogo ? 1 : 0,
        estado: 'ACTIVO',
        creado_por: userId,
        actualizado_por: userId,
      });
      mocks.products.set(idProducto, product);
      mocks.normalizedNameIndex.set(input.nombreNormalizado, idProducto);
      return product;
    },
  ),
  updateProduct: vi.fn(
    async (_env: ApiEnv, idProducto: string, input: UpdateProductInput, userId: string) => {
      const product = mocks.products.get(idProducto);
      if (!product) throw new Error('missing mock product');
      if (input.nombreProducto !== undefined) product.nombre_producto = input.nombreProducto;
      if (input.nombreNormalizado !== undefined) {
        if (product.nombre_normalizado)
          mocks.normalizedNameIndex.delete(product.nombre_normalizado);
        product.nombre_normalizado = input.nombreNormalizado;
        mocks.normalizedNameIndex.set(input.nombreNormalizado, idProducto);
      }
      if (input.idCategoria !== undefined) product.id_categoria = input.idCategoria;
      product.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return product;
    },
  ),
  updateProductStatus: vi.fn(
    async (_env: ApiEnv, idProducto: string, estado: ProductStatus, userId: string) => {
      const product = mocks.products.get(idProducto);
      if (!product) throw new Error('missing mock product');
      product.estado = estado;
      product.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return product;
    },
  ),
}));

const { createProduct, getProduct, listProducts, updateProduct, updateProductStatus } =
  await import('./products.service');

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

function createProductRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id_producto: 'prd_1',
    id_categoria: 'cat_1',
    nombre_producto: 'Blusa Roja',
    descripcion: null,
    marca: null,
    referencia: null,
    imagen_principal: null,
    mostrar_en_catalogo: 0,
    estado: 'ACTIVO',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: null,
    actualizado_por: null,
    nombre_normalizado: 'blusa roja',
    categoria_nombre: 'Blusas',
    categoria_estado: 'ACTIVA',
    ...overrides,
  };
}

function addProduct(product: ProductRecord): void {
  mocks.products.set(product.id_producto, product);
  if (product.nombre_normalizado) {
    mocks.normalizedNameIndex.set(product.nombre_normalizado, product.id_producto);
  }
}

function addCategory(idCategoria = 'cat_1', estado: 'ACTIVA' | 'INACTIVA' = 'ACTIVA'): void {
  mocks.categories.set(idCategoria, { id_categoria: idCategoria, estado });
}

function createInput(overrides: Partial<CreateProductInput> = {}): CreateProductInput {
  return {
    nombreProducto: 'Blusa Roja',
    nombreNormalizado: 'blusa roja',
    idCategoria: 'cat_1',
    descripcion: null,
    marca: null,
    referencia: null,
    visibleCatalogo: false,
    ...overrides,
  };
}

describe('products service', () => {
  beforeEach(() => {
    mocks.products = new Map();
    mocks.normalizedNameIndex = new Map();
    mocks.categories = new Map();
    mocks.lastFilters = null;
    mocks.lastUpdatedBy = '';
  });

  it('crear producto rechaza categoria inexistente o INACTIVA', async () => {
    await expect(createProduct(env, adminAuth, createInput())).rejects.toMatchObject({
      code: 'PRODUCT_CATEGORY_NOT_FOUND',
      status: 404,
    });

    addCategory('cat_1', 'INACTIVA');
    await expect(createProduct(env, adminAuth, createInput())).rejects.toMatchObject({
      code: 'PRODUCT_CATEGORY_INACTIVE',
      status: 409,
    });
  });

  it('crear producto rechaza nombre normalizado duplicado', async () => {
    addCategory();
    addProduct(createProductRecord({ id_producto: 'prd_1', nombre_normalizado: 'blusa roja' }));

    await expect(createProduct(env, adminAuth, createInput())).rejects.toMatchObject({
      code: 'PRODUCT_NAME_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('crear producto guarda ACTIVO y auditoria', async () => {
    addCategory();

    const product = await createProduct(env, adminAuth, createInput({ visibleCatalogo: true }));

    expect(product.estado).toBe('ACTIVO');
    expect(product.creadoPor).toBe('usr_admin');
    expect(product.actualizadoPor).toBe('usr_admin');
    expect(product.visibleCatalogo).toBe(true);
  });

  it('editar producto valida categoria activa y nombre duplicado', async () => {
    addCategory();
    addCategory('cat_2', 'INACTIVA');
    addProduct(createProductRecord({ id_producto: 'prd_1', nombre_normalizado: 'uno' }));
    addProduct(createProductRecord({ id_producto: 'prd_2', nombre_normalizado: 'dos' }));

    await expect(
      updateProduct(env, adminAuth, 'prd_1', { idCategoria: 'cat_2' }),
    ).rejects.toMatchObject({
      code: 'PRODUCT_CATEGORY_INACTIVE',
      status: 409,
    });
    await expect(
      updateProduct(env, adminAuth, 'prd_1', {
        nombreProducto: 'Dos',
        nombreNormalizado: 'dos',
      }),
    ).rejects.toMatchObject({
      code: 'PRODUCT_NAME_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('administrador puede cambiar estado a INACTIVO y ACTIVO', async () => {
    addProduct(createProductRecord({ id_producto: 'prd_1' }));

    const inactive = await updateProductStatus(env, adminAuth, 'prd_1', { estado: 'INACTIVO' });
    const active = await updateProductStatus(env, adminAuth, 'prd_1', { estado: 'ACTIVO' });

    expect(inactive.estado).toBe('INACTIVO');
    expect(active.estado).toBe('ACTIVO');
    expect(mocks.lastUpdatedBy).toBe('usr_admin');
  });

  it('vendedor ve solo productos activos', async () => {
    addProduct(createProductRecord({ id_producto: 'prd_1', estado: 'ACTIVO' }));
    addProduct(createProductRecord({ id_producto: 'prd_2', estado: 'INACTIVO' }));

    const products = await listProducts(env, sellerAuth, { limit: 50, offset: 0 });

    expect(products).toHaveLength(1);
    expect(mocks.lastFilters?.estado).toBe('ACTIVO');
    await expect(getProduct(env, sellerAuth, 'prd_2')).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      status: 404,
    });
  });

  it('listado aplica filtros basicos', async () => {
    await listProducts(env, adminAuth, {
      buscar: 'blusa',
      estado: 'INACTIVO',
      categoria: 'cat_1',
      visibleCatalogo: true,
      limit: 50,
      offset: 0,
    });

    expect(mocks.lastFilters).toEqual({
      buscar: 'blusa',
      estado: 'INACTIVO',
      categoria: 'cat_1',
      visibleCatalogo: true,
      limit: 50,
      offset: 0,
    });
  });
});
