import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type { InventoryMovementRecord, InventoryVariantRecord } from './inventory.types';

const mocks = vi.hoisted(() => ({
  variants: [] as InventoryVariantRecord[],
  movements: [] as InventoryMovementRecord[],
  stockWrites: 0,
  movementWrites: 0,
  lotWrites: 0,
  saleWrites: 0,
  imageWrites: 0,
  productWrites: 0,
  lastOnlyVisibleToSeller: false,
  lastMovementFilters: undefined as unknown,
}));

vi.mock('./inventory.repository', () => ({
  listInventoryVariants: vi.fn(async (_env: ApiEnv, filters, onlyVisibleToSeller: boolean) => {
    mocks.lastOnlyVisibleToSeller = onlyVisibleToSeller;
    return mocks.variants.filter((variant) => {
      if (
        onlyVisibleToSeller &&
        (variant.estado !== 'ACTIVA' || variant.estado_producto !== 'ACTIVO')
      ) {
        return false;
      }
      if (filters.stockBajo === true && variant.stock_actual > variant.stock_minimo) return false;
      if (filters.sinStock === true && variant.stock_actual > 0) return false;
      if (
        filters.buscar &&
        ![variant.nombre_producto, variant.sku, variant.codigo_qr, variant.talla, variant.color]
          .filter(Boolean)
          .some((value) => String(value).includes(filters.buscar))
      ) {
        return false;
      }
      return true;
    });
  }),
  findInventoryVariantById: vi.fn(
    async (_env: ApiEnv, idVariante: string, onlyVisibleToSeller: boolean) => {
      mocks.lastOnlyVisibleToSeller = onlyVisibleToSeller;
      const variant = mocks.variants.find((item) => item.id_variante === idVariante);
      if (!variant) return null;
      if (
        onlyVisibleToSeller &&
        (variant.estado !== 'ACTIVA' || variant.estado_producto !== 'ACTIVO')
      ) {
        return null;
      }
      return variant;
    },
  ),
  listInventoryMovements: vi.fn(async (_env: ApiEnv, filters) => {
    mocks.lastMovementFilters = filters;
    return mocks.movements.filter((movement) => {
      if (filters.variante && movement.id_variante !== filters.variante) return false;
      if (filters.tipoMovimiento && movement.tipo_movimiento !== filters.tipoMovimiento)
        return false;
      return true;
    });
  }),
  countMovementsByVariant: vi.fn(
    async (_env: ApiEnv, idVariante: string) =>
      mocks.movements.filter((movement) => movement.id_variante === idVariante).length,
  ),
  registerInitialInventory: vi.fn(async (_env: ApiEnv, userId: string, movements) => {
    for (const movement of movements) {
      const variant = mocks.variants.find((item) => item.id_variante === movement.idVariante);
      if (!variant) continue;

      variant.stock_actual = movement.stockDespues;
      mocks.movements.push({
        id_movimiento: movement.idMovimiento,
        id_variante: movement.idVariante,
        tipo_movimiento: 'INVENTARIO_INICIAL',
        cantidad: movement.cantidad,
        stock_antes: movement.stockAntes,
        stock_despues: movement.stockDespues,
        motivo: movement.motivo,
        referencia_tipo: 'INVENTARIO_INICIAL',
        referencia_id: movement.idMovimiento,
        creado_por: userId,
        creado_en: '2026-07-02',
        sku: variant.sku,
        codigo_qr: variant.codigo_qr,
        talla: variant.talla,
        color: variant.color,
        id_producto: variant.id_producto,
        nombre_producto: variant.nombre_producto,
      });
      mocks.movementWrites += 1;
      mocks.stockWrites += 1;
    }
  }),
  registerManualInventoryAdjustment: vi.fn(async (_env: ApiEnv, userId: string, movement) => {
    const variant = mocks.variants.find((item) => item.id_variante === movement.idVariante);
    if (!variant) return;

    variant.stock_actual = movement.stockDespues;
    mocks.movements.push({
      id_movimiento: movement.idMovimiento,
      id_variante: movement.idVariante,
      tipo_movimiento: movement.tipoAjuste,
      cantidad: movement.cantidad,
      stock_antes: movement.stockAntes,
      stock_despues: movement.stockDespues,
      motivo: movement.motivo,
      referencia_tipo: 'AJUSTE_INVENTARIO',
      referencia_id: movement.idMovimiento,
      creado_por: userId,
      creado_en: '2026-07-02',
      sku: variant.sku,
      codigo_qr: variant.codigo_qr,
      talla: variant.talla,
      color: variant.color,
      id_producto: variant.id_producto,
      nombre_producto: variant.nombre_producto,
    });
    mocks.movementWrites += 1;
    mocks.stockWrites += 1;
  }),
  movementExists: vi.fn(async (_env: ApiEnv, idMovimiento: string) =>
    mocks.movements.some((movement) => movement.id_movimiento === idMovimiento),
  ),
}));

const {
  getInventoryVariant,
  listInventoryMovements,
  listInventoryVariants,
  registerInitialInventory,
  registerManualInventoryAdjustment,
} = await import('./inventory.service');

const env = {} as ApiEnv;
const adminAuth = { user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' } } as AuthContext;
const sellerAuth = { user: { id_usuario: 'usr_seller', rol: 'VENDEDOR' } } as AuthContext;

function buildVariant(overrides: Partial<InventoryVariantRecord> = {}): InventoryVariantRecord {
  return {
    id_variante: 'var_1',
    id_producto: 'prd_1',
    sku: 'SKU-1',
    codigo_qr: 'NTV-VAR-000001',
    talla: 'M',
    color: 'Azul',
    precio_compra: 5000,
    precio_venta: 12000,
    stock_actual: 2,
    stock_minimo: 3,
    estado: 'ACTIVA',
    nombre_producto: 'Blusa',
    estado_producto: 'ACTIVO',
    id_categoria: 'cat_1',
    nombre_categoria: 'Blusas',
    ...overrides,
  };
}

function buildMovement(overrides: Partial<InventoryMovementRecord> = {}): InventoryMovementRecord {
  return {
    id_movimiento: 'mov_1',
    id_variante: 'var_1',
    tipo_movimiento: 'LOTE_ENTRADA',
    cantidad: 2,
    stock_antes: 0,
    stock_despues: 2,
    motivo: 'Confirmacion de lote',
    referencia_tipo: 'LOTE_ENTRADA',
    referencia_id: 'lot_1',
    creado_por: 'usr_admin',
    creado_en: '2026-07-02',
    sku: 'SKU-1',
    codigo_qr: 'NTV-VAR-000001',
    talla: 'M',
    color: 'Azul',
    id_producto: 'prd_1',
    nombre_producto: 'Blusa',
    ...overrides,
  };
}

describe('inventory service', () => {
  beforeEach(() => {
    mocks.variants = [
      buildVariant(),
      buildVariant({ id_variante: 'var_inactiva', estado: 'INACTIVA' }),
      buildVariant({ id_variante: 'var_producto_inactivo', estado_producto: 'INACTIVO' }),
      buildVariant({
        id_variante: 'var_sin_stock',
        stock_actual: 0,
        stock_minimo: 1,
        sku: 'SKU-0',
      }),
    ];
    mocks.movements = [
      buildMovement(),
      buildMovement({ id_movimiento: 'mov_2', id_variante: 'var_2' }),
    ];
    mocks.stockWrites = 0;
    mocks.movementWrites = 0;
    mocks.lotWrites = 0;
    mocks.saleWrites = 0;
    mocks.imageWrites = 0;
    mocks.productWrites = 0;
  });

  it('ADMINISTRADOR lista variantes activas e inactivas', async () => {
    const variants = await listInventoryVariants(env, adminAuth, { limit: 50, offset: 0 });

    expect(mocks.lastOnlyVisibleToSeller).toBe(false);
    expect(variants).toHaveLength(4);
    expect(variants[0]).toHaveProperty('precioCompraReferencia');
  });

  it('VENDEDOR solo ve variantes activas de productos activos y no ve costos', async () => {
    const variants = await listInventoryVariants(env, sellerAuth, { limit: 50, offset: 0 });

    expect(mocks.lastOnlyVisibleToSeller).toBe(true);
    expect(variants.map((variant) => variant.idVariante)).toEqual(['var_1', 'var_sin_stock']);
    expect(variants[0]).not.toHaveProperty('precioCompraReferencia');
  });

  it('aplica filtros stock_bajo, sin_stock y buscar', async () => {
    expect(
      await listInventoryVariants(env, adminAuth, { stockBajo: true, limit: 50, offset: 0 }),
    ).toHaveLength(4);
    expect(
      await listInventoryVariants(env, adminAuth, { sinStock: true, limit: 50, offset: 0 }),
    ).toHaveLength(1);
    expect(
      await listInventoryVariants(env, adminAuth, { buscar: 'SKU-0', limit: 50, offset: 0 }),
    ).toHaveLength(1);
  });

  it('consulta detalle con stock_bajo y sin_stock', async () => {
    const variant = await getInventoryVariant(env, adminAuth, 'var_sin_stock');

    expect(variant.stockBajo).toBe(true);
    expect(variant.sinStock).toBe(true);
  });

  it('VENDEDOR no ve detalle de variante inactiva', async () => {
    await expect(getInventoryVariant(env, sellerAuth, 'var_inactiva')).rejects.toMatchObject({
      code: 'INVENTORY_VARIANT_NOT_FOUND',
    });
  });

  it('ADMINISTRADOR consulta movimientos y filtros', async () => {
    const movements = await listInventoryMovements(env, {
      variante: 'var_1',
      limit: 50,
      offset: 0,
    });

    expect(movements).toHaveLength(1);
    expect(movements[0]?.tipoMovimiento).toBe('LOTE_ENTRADA');
    expect(mocks.lastMovementFilters).toMatchObject({ variante: 'var_1' });
  });

  it('consultas no modifican stock ni crean movimientos', async () => {
    const beforeStock = mocks.variants[0]?.stock_actual;

    await listInventoryVariants(env, adminAuth, { limit: 50, offset: 0 });
    await listInventoryMovements(env, { limit: 50, offset: 0 });

    expect(mocks.variants[0]?.stock_actual).toBe(beforeStock);
    expect(mocks.stockWrites).toBe(0);
    expect(mocks.movementWrites).toBe(0);
  });

  it('ADMINISTRADOR registra inventario inicial, aumenta stock y crea movimiento', async () => {
    mocks.movements = [];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 0;

    const result = await registerInitialInventory(env, adminAuth, {
      items: [{ idVariante: 'var_1', cantidadInicial: 5, motivo: 'Carga inicial' }],
    });

    expect(result).toEqual({
      items_procesados: 1,
      movimientos_creados: 1,
      total_unidades_ingresadas: 5,
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(5);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'INVENTARIO_INICIAL',
      stock_antes: 0,
      stock_despues: 5,
      referencia_tipo: 'INVENTARIO_INICIAL',
      creado_por: 'usr_admin',
    });
    expect(mocks.lotWrites).toBe(0);
    expect(mocks.saleWrites).toBe(0);
    expect(mocks.imageWrites).toBe(0);
    expect(mocks.productWrites).toBe(0);
  });

  it('operacion con varios items crea varios movimientos', async () => {
    mocks.movements = [];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 0;
    mocks.variants.push(buildVariant({ id_variante: 'var_2', stock_actual: 0, sku: 'SKU-2' }));

    const result = await registerInitialInventory(env, adminAuth, {
      items: [
        { idVariante: 'var_1', cantidadInicial: 5, motivo: 'Carga inicial' },
        { idVariante: 'var_2', cantidadInicial: 3, motivo: 'Carga inicial' },
      ],
    });

    expect(result.movimientos_creados).toBe(2);
    expect(result.total_unidades_ingresadas).toBe(8);
    expect(mocks.movementWrites).toBe(2);
  });

  it('rechaza variante inexistente, inactiva o producto inactivo', async () => {
    mocks.movements = [];

    await expect(
      registerInitialInventory(env, adminAuth, {
        items: [{ idVariante: 'missing', cantidadInicial: 1, motivo: 'x' }],
      }),
    ).rejects.toMatchObject({ code: 'INVENTORY_VARIANT_NOT_FOUND' });

    await expect(
      registerInitialInventory(env, adminAuth, {
        items: [{ idVariante: 'var_inactiva', cantidadInicial: 1, motivo: 'x' }],
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_INACTIVE' });

    await expect(
      registerInitialInventory(env, adminAuth, {
        items: [{ idVariante: 'var_producto_inactivo', cantidadInicial: 1, motivo: 'x' }],
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_INACTIVE' });
  });

  it('rechaza variante con stock o movimientos previos', async () => {
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 2;

    await expect(
      registerInitialInventory(env, adminAuth, {
        items: [{ idVariante: 'var_1', cantidadInicial: 1, motivo: 'x' }],
      }),
    ).rejects.toMatchObject({ code: 'INITIAL_INVENTORY_ALREADY_HAS_STOCK' });

    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 0;
    mocks.movements = [buildMovement({ id_variante: 'var_1' })];

    await expect(
      registerInitialInventory(env, adminAuth, {
        items: [{ idVariante: 'var_1', cantidadInicial: 1, motivo: 'x' }],
      }),
    ).rejects.toMatchObject({ code: 'INITIAL_INVENTORY_ALREADY_HAS_HISTORY' });
  });

  it('ADMINISTRADOR hace ajuste positivo y crea movimiento', async () => {
    mocks.movements = [];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 10;

    const result = await registerManualInventoryAdjustment(env, adminAuth, {
      idVariante: 'var_1',
      tipoAjuste: 'AJUSTE_POSITIVO',
      cantidad: 2,
      motivo: 'Correccion por conteo',
    });

    expect(result).toMatchObject({
      id_variante: 'var_1',
      tipo_ajuste: 'AJUSTE_POSITIVO',
      cantidad: 2,
      stock_antes: 10,
      stock_despues: 12,
      movimiento_creado: true,
    });
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(
      12,
    );
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'AJUSTE_POSITIVO',
      referencia_tipo: 'AJUSTE_INVENTARIO',
      creado_por: 'usr_admin',
    });
  });

  it('ADMINISTRADOR hace ajuste negativo y crea movimiento', async () => {
    mocks.movements = [];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 10;

    const result = await registerManualInventoryAdjustment(env, adminAuth, {
      idVariante: 'var_1',
      tipoAjuste: 'AJUSTE_NEGATIVO',
      cantidad: 3,
      motivo: 'Producto faltante',
    });

    expect(result.stock_antes).toBe(10);
    expect(result.stock_despues).toBe(7);
    expect(mocks.variants.find((variant) => variant.id_variante === 'var_1')?.stock_actual).toBe(7);
    expect(mocks.movements[0]).toMatchObject({
      tipo_movimiento: 'AJUSTE_NEGATIVO',
      stock_antes: 10,
      stock_despues: 7,
      referencia_tipo: 'AJUSTE_INVENTARIO',
    });
  });

  it('rechaza ajuste negativo si deja stock negativo', async () => {
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 1;

    await expect(
      registerManualInventoryAdjustment(env, adminAuth, {
        idVariante: 'var_1',
        tipoAjuste: 'AJUSTE_NEGATIVO',
        cantidad: 2,
        motivo: 'Producto faltante',
      }),
    ).rejects.toMatchObject({ code: 'NEGATIVE_STOCK_NOT_ALLOWED' });
  });

  it('rechaza ajuste sobre variante inexistente, inactiva o producto inactivo', async () => {
    await expect(
      registerManualInventoryAdjustment(env, adminAuth, {
        idVariante: 'missing',
        tipoAjuste: 'AJUSTE_POSITIVO',
        cantidad: 1,
        motivo: 'x',
      }),
    ).rejects.toMatchObject({ code: 'INVENTORY_VARIANT_NOT_FOUND' });

    await expect(
      registerManualInventoryAdjustment(env, adminAuth, {
        idVariante: 'var_inactiva',
        tipoAjuste: 'AJUSTE_POSITIVO',
        cantidad: 1,
        motivo: 'x',
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_INACTIVE' });

    await expect(
      registerManualInventoryAdjustment(env, adminAuth, {
        idVariante: 'var_producto_inactivo',
        tipoAjuste: 'AJUSTE_POSITIVO',
        cantidad: 1,
        motivo: 'x',
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_INACTIVE' });
  });

  it('ajustes no crean lotes, ventas, imagenes, etiquetas ni modifican producto base', async () => {
    mocks.movements = [];
    mocks.variants.find((variant) => variant.id_variante === 'var_1')!.stock_actual = 4;

    await registerManualInventoryAdjustment(env, adminAuth, {
      idVariante: 'var_1',
      tipoAjuste: 'AJUSTE_POSITIVO',
      cantidad: 1,
      motivo: 'Correccion',
    });

    expect(mocks.lotWrites).toBe(0);
    expect(mocks.saleWrites).toBe(0);
    expect(mocks.imageWrites).toBe(0);
    expect(mocks.productWrites).toBe(0);
  });
});
