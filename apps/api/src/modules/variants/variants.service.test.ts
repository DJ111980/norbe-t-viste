import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  CreateVariantInput,
  ListVariantsFilters,
  ProductForVariant,
  UpdateVariantInput,
  VariantRecord,
  VariantStatus,
} from './variants.types';

const mocks = vi.hoisted(() => ({
  variants: new Map<string, VariantRecord>(),
  products: new Map<string, ProductForVariant>(),
  lastFilters: null as ListVariantsFilters | null,
  lastUpdatedBy: '',
}));

vi.mock('./variants.repository', () => ({
  listVariants: vi.fn(async (_env: ApiEnv, filters: ListVariantsFilters) => {
    mocks.lastFilters = filters;
    return [...mocks.variants.values()].filter((variant) => {
      if (filters.estado && variant.estado !== filters.estado) return false;
      if (filters.stockBajo === true && variant.stock_actual > variant.stock_minimo) return false;
      return true;
    });
  }),
  findVariantById: vi.fn(
    async (_env: ApiEnv, idVariante: string) => mocks.variants.get(idVariante) ?? null,
  ),
  findVariantByQr: vi.fn(async (_env: ApiEnv, codigoQr: string) => {
    return [...mocks.variants.values()].find((variant) => variant.codigo_qr === codigoQr) ?? null;
  }),
  findProductForVariant: vi.fn(
    async (_env: ApiEnv, idProducto: string) => mocks.products.get(idProducto) ?? null,
  ),
  findVariantByCombination: vi.fn(
    async (_env: ApiEnv, idProducto: string, tallaNormalizada: string, colorNormalizado: string) =>
      [...mocks.variants.values()].find(
        (variant) =>
          variant.id_producto === idProducto &&
          variant.talla_normalizada === tallaNormalizada &&
          variant.color_normalizado === colorNormalizado,
      ) ?? null,
  ),
  findVariantBySku: vi.fn(
    async (_env: ApiEnv, sku: string) =>
      [...mocks.variants.values()].find((variant) => variant.sku === sku) ?? null,
  ),
  countVariants: vi.fn(async () => mocks.variants.size),
  createVariant: vi.fn(
    async (
      _env: ApiEnv,
      idVariante: string,
      idProducto: string,
      input: CreateVariantInput,
      sku: string,
      codigoQr: string,
      userId: string,
    ) => {
      const variant = createVariantRecord({
        id_variante: idVariante,
        id_producto: idProducto,
        sku,
        codigo_qr: codigoQr,
        talla: input.talla,
        color: input.color,
        talla_normalizada: input.tallaNormalizada,
        color_normalizado: input.colorNormalizado,
        precio_compra: input.precioCompraReferencia,
        precio_venta: input.precioVenta,
        stock_actual: 0,
        stock_minimo: input.stockMinimo,
        creado_por: userId,
        actualizado_por: userId,
      });
      mocks.variants.set(idVariante, variant);
      return variant;
    },
  ),
  updateVariant: vi.fn(
    async (_env: ApiEnv, idVariante: string, input: UpdateVariantInput, userId: string) => {
      const variant = mocks.variants.get(idVariante);
      if (!variant) throw new Error('missing mock variant');
      if (input.talla !== undefined) variant.talla = input.talla;
      if (input.color !== undefined) variant.color = input.color;
      if (input.tallaNormalizada !== undefined) variant.talla_normalizada = input.tallaNormalizada;
      if (input.colorNormalizado !== undefined) variant.color_normalizado = input.colorNormalizado;
      if (input.sku !== undefined) variant.sku = input.sku;
      variant.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return variant;
    },
  ),
  updateVariantStatus: vi.fn(
    async (_env: ApiEnv, idVariante: string, estado: VariantStatus, userId: string) => {
      const variant = mocks.variants.get(idVariante);
      if (!variant) throw new Error('missing mock variant');
      variant.estado = estado;
      variant.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return variant;
    },
  ),
}));

const {
  createVariant,
  getVariant,
  getVariantByQr,
  listVariants,
  updateVariant,
  updateVariantStatus,
} = await import('./variants.service');

const env = {} as ApiEnv;
const adminAuth = createAuth('ADMINISTRADOR');
const sellerAuth = createAuth('VENDEDOR');

function createAuth(rol: 'ADMINISTRADOR' | 'VENDEDOR'): AuthContext {
  return {
    user: {
      id_usuario: rol === 'ADMINISTRADOR' ? 'usr_admin' : 'usr_vendedor',
      nombre_completo: rol,
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

function createVariantRecord(overrides: Partial<VariantRecord> = {}): VariantRecord {
  return {
    id_variante: 'var_1',
    id_producto: 'prd_1',
    sku: 'NTV-SKU-000001',
    codigo_qr: 'NTV-VAR-000001',
    ruta_qr: null,
    talla: 'M',
    color: 'Rojo',
    talla_normalizada: 'm',
    color_normalizado: 'rojo',
    precio_compra: 20000,
    precio_venta: 50000,
    stock_actual: 0,
    stock_minimo: 1,
    imagen_variante: null,
    mostrar_en_catalogo: 0,
    estado: 'ACTIVA',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: null,
    actualizado_por: null,
    nombre_producto: 'Blusa Roja',
    estado_producto: 'ACTIVO',
    ...overrides,
  };
}

function createInput(overrides: Partial<CreateVariantInput> = {}): CreateVariantInput {
  return {
    talla: 'M',
    color: 'Rojo',
    tallaNormalizada: 'm',
    colorNormalizado: 'rojo',
    precioVenta: 50000,
    precioCompraReferencia: 20000,
    stockMinimo: 1,
    ...overrides,
  };
}

function addProduct(idProducto = 'prd_1', estado: 'ACTIVO' | 'INACTIVO' = 'ACTIVO'): void {
  mocks.products.set(idProducto, { id_producto: idProducto, estado });
}

function addVariant(variant: VariantRecord): void {
  mocks.variants.set(variant.id_variante, variant);
}

describe('variants service', () => {
  beforeEach(() => {
    mocks.variants = new Map();
    mocks.products = new Map();
    mocks.lastFilters = null;
    mocks.lastUpdatedBy = '';
  });

  it('crear variante rechaza producto inexistente o INACTIVO', async () => {
    await expect(createVariant(env, adminAuth, 'prd_1', createInput())).rejects.toMatchObject({
      code: 'VARIANT_PRODUCT_NOT_FOUND',
      status: 404,
    });
    addProduct('prd_1', 'INACTIVO');
    await expect(createVariant(env, adminAuth, 'prd_1', createInput())).rejects.toMatchObject({
      code: 'VARIANT_PRODUCT_INACTIVE',
      status: 409,
    });
  });

  it('crear variante rechaza combinacion duplicada', async () => {
    addProduct();
    addVariant(createVariantRecord({ id_variante: 'var_1' }));

    await expect(createVariant(env, adminAuth, 'prd_1', createInput())).rejects.toMatchObject({
      code: 'VARIANT_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('crear variante genera SKU y codigo QR si no vienen', async () => {
    addProduct();

    const variant = await createVariant(env, adminAuth, 'prd_1', createInput({ sku: undefined }));

    expect(variant.sku).toBe('NTV-SKU-000001');
    expect(variant.codigoQr).toBe('NTV-VAR-000001');
    expect(variant.stockActual).toBe(0);
    expect(variant.creadoPor).toBe('usr_admin');
    expect(variant.actualizadoPor).toBe('usr_admin');
  });

  it('crear variante respeta SKU manual unico y rechaza duplicado', async () => {
    addProduct();

    const variant = await createVariant(
      env,
      adminAuth,
      'prd_1',
      createInput({ sku: 'SKU-MANUAL' }),
    );
    expect(variant.sku).toBe('SKU-MANUAL');

    addProduct('prd_2');
    await expect(
      createVariant(
        env,
        adminAuth,
        'prd_2',
        createInput({
          sku: 'SKU-MANUAL',
          tallaNormalizada: 'l',
          talla: 'L',
        }),
      ),
    ).rejects.toMatchObject({
      code: 'VARIANT_SKU_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('editar variante rechaza combinacion duplicada y actualiza auditoria', async () => {
    addVariant(createVariantRecord({ id_variante: 'var_1', talla_normalizada: 'm' }));
    addVariant(createVariantRecord({ id_variante: 'var_2', talla_normalizada: 'l' }));

    await expect(
      updateVariant(env, adminAuth, 'var_1', {
        talla: 'L',
        tallaNormalizada: 'l',
      }),
    ).rejects.toMatchObject({
      code: 'VARIANT_ALREADY_EXISTS',
      status: 409,
    });

    const variant = await updateVariant(env, adminAuth, 'var_1', { sku: 'SKU-NUEVO' });
    expect(variant.sku).toBe('SKU-NUEVO');
    expect(mocks.lastUpdatedBy).toBe('usr_admin');
  });

  it('administrador puede cambiar estado', async () => {
    addVariant(createVariantRecord({ id_variante: 'var_1' }));

    const inactive = await updateVariantStatus(env, adminAuth, 'var_1', { estado: 'INACTIVA' });
    const active = await updateVariantStatus(env, adminAuth, 'var_1', { estado: 'ACTIVA' });

    expect(inactive.estado).toBe('INACTIVA');
    expect(active.estado).toBe('ACTIVA');
  });

  it('vendedor ve solo variantes activas de productos activos y consulta por QR', async () => {
    addVariant(
      createVariantRecord({ id_variante: 'var_1', estado: 'ACTIVA', estado_producto: 'ACTIVO' }),
    );
    addVariant(
      createVariantRecord({
        id_variante: 'var_2',
        estado: 'INACTIVA',
        codigo_qr: 'NTV-VAR-000002',
      }),
    );
    addVariant(
      createVariantRecord({
        id_variante: 'var_3',
        estado_producto: 'INACTIVO',
        codigo_qr: 'NTV-VAR-000003',
      }),
    );

    const variants = await listVariants(env, sellerAuth, { limit: 50, offset: 0 });

    expect(variants).toHaveLength(1);
    expect(mocks.lastFilters?.estado).toBe('ACTIVA');
    expect((await getVariantByQr(env, sellerAuth, 'NTV-VAR-000001')).codigoQr).toBe(
      'NTV-VAR-000001',
    );
    await expect(getVariant(env, sellerAuth, 'var_2')).rejects.toMatchObject({
      code: 'VARIANT_NOT_FOUND',
      status: 404,
    });
    await expect(getVariantByQr(env, sellerAuth, 'NTV-VAR-000003')).rejects.toMatchObject({
      code: 'VARIANT_PRODUCT_INACTIVE',
      status: 409,
    });
  });

  it('listado aplica filtros basicos y stock bajo', async () => {
    await listVariants(env, adminAuth, {
      buscar: 'blusa',
      estado: 'ACTIVA',
      producto: 'prd_1',
      talla: 'M',
      color: 'Rojo',
      codigoQr: 'NTV-VAR-000001',
      sku: 'NTV-SKU-000001',
      stockBajo: true,
      limit: 50,
      offset: 0,
    });

    expect(mocks.lastFilters).toEqual({
      buscar: 'blusa',
      estado: 'ACTIVA',
      producto: 'prd_1',
      talla: 'M',
      color: 'Rojo',
      codigoQr: 'NTV-VAR-000001',
      sku: 'NTV-SKU-000001',
      stockBajo: true,
      limit: 50,
      offset: 0,
    });
  });
});
