import { describe, expect, it } from 'vitest';
import {
  validateListInventoryMovementsFilters,
  validateListInventoryVariantsFilters,
  validateManualInventoryAdjustmentInput,
  validateRegisterInitialInventoryInput,
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

  it('valida inventario inicial', () => {
    const input = validateRegisterInitialInventoryInput({
      items: [{ id_variante: ' var_1 ', cantidad_inicial: 5, motivo: 'Carga inicial' }],
    });

    expect(input.items[0]).toMatchObject({
      idVariante: 'var_1',
      cantidadInicial: 5,
      motivo: 'Carga inicial',
    });
  });

  it('rechaza inventario inicial invalido', () => {
    expectErrorCode(
      () => validateRegisterInitialInventoryInput({ items: [] }),
      'EMPTY_INITIAL_INVENTORY',
    );
    expectErrorCode(
      () =>
        validateRegisterInitialInventoryInput({ items: [{ cantidad_inicial: 1, motivo: 'x' }] }),
      'INITIAL_INVENTORY_VARIANT_REQUIRED',
    );
    expectErrorCode(
      () =>
        validateRegisterInitialInventoryInput({
          items: [{ id_variante: 'var_1', cantidad_inicial: 0, motivo: 'x' }],
        }),
      'INVALID_INITIAL_INVENTORY_QUANTITY',
    );
    expectErrorCode(
      () =>
        validateRegisterInitialInventoryInput({
          items: [{ id_variante: 'var_1', cantidad_inicial: 1, motivo: ' ' }],
        }),
      'INITIAL_INVENTORY_REASON_REQUIRED',
    );
    expectErrorCode(
      () =>
        validateRegisterInitialInventoryInput({
          items: [
            { id_variante: 'var_1', cantidad_inicial: 1, motivo: 'x' },
            { id_variante: 'var_1', cantidad_inicial: 1, motivo: 'x' },
          ],
        }),
      'DUPLICATED_INITIAL_INVENTORY_VARIANT',
    );
  });

  it('valida ajuste manual de inventario', () => {
    const input = validateManualInventoryAdjustmentInput({
      id_variante: ' var_1 ',
      tipo_ajuste: 'AJUSTE_POSITIVO',
      cantidad: 2,
      motivo: 'Correccion por conteo',
    });

    expect(input).toEqual({
      idVariante: 'var_1',
      tipoAjuste: 'AJUSTE_POSITIVO',
      cantidad: 2,
      motivo: 'Correccion por conteo',
    });
  });

  it('rechaza ajuste manual invalido', () => {
    expectErrorCode(
      () => validateManualInventoryAdjustmentInput({}),
      'INVENTORY_ADJUSTMENT_TYPE_REQUIRED',
    );
    expectErrorCode(
      () =>
        validateManualInventoryAdjustmentInput({
          id_variante: 'var_1',
          tipo_ajuste: 'OTRO',
          cantidad: 1,
          motivo: 'x',
        }),
      'INVALID_INVENTORY_ADJUSTMENT_TYPE',
    );
    expectErrorCode(
      () =>
        validateManualInventoryAdjustmentInput({
          id_variante: 'var_1',
          tipo_ajuste: 'AJUSTE_NEGATIVO',
          cantidad: 0,
          motivo: 'x',
        }),
      'INVALID_INVENTORY_ADJUSTMENT_QUANTITY',
    );
    expectErrorCode(
      () =>
        validateManualInventoryAdjustmentInput({
          id_variante: 'var_1',
          tipo_ajuste: 'AJUSTE_NEGATIVO',
          cantidad: 1,
          motivo: ' ',
        }),
      'INVENTORY_ADJUSTMENT_REASON_REQUIRED',
    );
  });
});
