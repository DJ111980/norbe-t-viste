import { describe, expect, it } from 'vitest';
import {
  validateCreateEntryLotDetailInput,
  validateCreateEntryLotInput,
  validateListEntryLotsFilters,
  validateUpdateEntryLotDetailInput,
  validateUpdateEntryLotInput,
} from './entry-lots.validation';

function expectErrorCode(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error('Expected validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe('entry lots validation', () => {
  it('crea lote con proveedor opcional y strings vacios como null', () => {
    const input = validateCreateEntryLotInput({
      id_proveedor: '',
      numero_factura: ' FAC-1 ',
      observaciones: ' ',
    });

    expect(input.idProveedor).toBeNull();
    expect(input.numeroFactura).toBe('FAC-1');
    expect(input.observaciones).toBeNull();
    expect(input.fechaLote).toBeTruthy();
  });

  it('rechaza edicion de lote con payload vacio', () => {
    expectErrorCode(() => validateUpdateEntryLotInput({}), 'EMPTY_UPDATE');
  });

  it('valida filtros basicos de listado', () => {
    const filters = validateListEntryLotsFilters(
      new URLSearchParams('estado=BORRADOR&limit=500&offset=2'),
    );

    expect(filters.estado).toBe('BORRADOR');
    expect(filters.limit).toBe(100);
    expect(filters.offset).toBe(2);
  });

  it('crea detalle calculable y cantidad_etiquetas_qr por defecto igual a cantidad', () => {
    const input = validateCreateEntryLotDetailInput({
      id_variante: 'var_1',
      cantidad: 3,
      costo_unitario: 5000,
      subtotal: 1,
    });

    expect(input.cantidadEtiquetasQr).toBe(3);
  });

  it('rechaza cantidad invalida y costo negativo', () => {
    expectErrorCode(
      () =>
        validateCreateEntryLotDetailInput({
          id_variante: 'var_1',
          cantidad: 0,
          costo_unitario: 5000,
        }),
      'INVALID_ENTRY_LOT_DETAIL_QUANTITY',
    );

    expectErrorCode(
      () =>
        validateCreateEntryLotDetailInput({
          id_variante: 'var_1',
          cantidad: 1,
          costo_unitario: -1,
        }),
      'INVALID_ENTRY_LOT_DETAIL_COST',
    );
  });

  it('rechaza cambiar variante al editar detalle', () => {
    expectErrorCode(
      () =>
        validateUpdateEntryLotDetailInput({
          id_variante: 'var_2',
        }),
      'ENTRY_LOT_DETAIL_VARIANT_NOT_ALLOWED',
    );
  });
});
