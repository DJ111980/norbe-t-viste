import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type { InventoryMovementRecord, InventoryVariantRecord } from './inventory.types';

const mocks = vi.hoisted(() => ({
  variants: [] as InventoryVariantRecord[],
  movements: [] as InventoryMovementRecord[],
  stockWrites: 0,
  movementWrites: 0,
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
}));

const { getInventoryVariant, listInventoryMovements, listInventoryVariants } =
  await import('./inventory.service');

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
});
