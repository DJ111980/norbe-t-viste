import { describe, expect, it } from 'vitest';
import { toPublicInventoryMovement, toPublicInventoryVariant } from './inventory.mapper';
import type { InventoryMovementRecord, InventoryVariantRecord } from './inventory.types';

const variant: InventoryVariantRecord = {
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
};

const movement: InventoryMovementRecord = {
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
};

describe('inventory mapper', () => {
  it('calcula stock_bajo y oculta costo a VENDEDOR', () => {
    const mapped = toPublicInventoryVariant(variant, { role: 'VENDEDOR' });

    expect(mapped.stockBajo).toBe(true);
    expect(mapped.sinStock).toBe(false);
    expect(mapped).not.toHaveProperty('precioCompraReferencia');
  });

  it('muestra costo a ADMINISTRADOR', () => {
    expect(
      toPublicInventoryVariant(variant, { role: 'ADMINISTRADOR' }).precioCompraReferencia,
    ).toBe(5000);
  });

  it('mapea movimiento con variante y producto', () => {
    expect(toPublicInventoryMovement(movement)).toMatchObject({
      tipoMovimiento: 'LOTE_ENTRADA',
      variante: { idVariante: 'var_1' },
      producto: { idProducto: 'prd_1' },
    });
  });
});
