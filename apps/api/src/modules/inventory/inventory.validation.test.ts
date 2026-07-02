import { describe, expect, it } from 'vitest';
import {
  validateListInventoryMovementsFilters,
  validateListInventoryVariantsFilters,
} from './inventory.validation';

function expectErrorCode(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error('Expected validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe('inventory validation', () => {
  it('valida filtros de variantes', () => {
    const filters = validateListInventoryVariantsFilters(
      new URLSearchParams('stock_bajo=true&sin_stock=false&limit=500&offset=3'),
    );

    expect(filters.stockBajo).toBe(true);
    expect(filters.sinStock).toBe(false);
    expect(filters.limit).toBe(100);
    expect(filters.offset).toBe(3);
  });

  it('rechaza booleanos y estados invalidos', () => {
    expectErrorCode(
      () => validateListInventoryVariantsFilters(new URLSearchParams('stock_bajo=si')),
      'INVALID_BOOLEAN_FILTER',
    );
    expectErrorCode(
      () => validateListInventoryVariantsFilters(new URLSearchParams('estado=ACTIVO')),
      'INVALID_VARIANT_STATUS',
    );
  });

  it('valida filtros de movimientos', () => {
    const filters = validateListInventoryMovementsFilters(
      new URLSearchParams('tipo_movimiento=LOTE_ENTRADA&referencia_tipo=LOTE_ENTRADA'),
    );

    expect(filters.tipoMovimiento).toBe('LOTE_ENTRADA');
    expect(filters.referenciaTipo).toBe('LOTE_ENTRADA');
  });

  it('rechaza tipos de movimiento invalidos', () => {
    expectErrorCode(
      () => validateListInventoryMovementsFilters(new URLSearchParams('tipo_movimiento=COMPRA')),
      'INVALID_MOVEMENT_TYPE',
    );
  });
});
