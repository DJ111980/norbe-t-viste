import { describe, expect, it } from 'vitest';
import { MAX_BATCH_LABELS, validateBatchLabelPreviewInput } from './labels.validation';

describe('labels validation', () => {
  it('rechaza body vacio o items ausente', () => {
    expect(() => validateBatchLabelPreviewInput(null)).toThrow();
    expect(() => validateBatchLabelPreviewInput({})).toThrow();
  });

  it('rechaza items vacio', () => {
    expect(() => validateBatchLabelPreviewInput({ items: [] })).toThrow();
  });

  it('rechaza cantidad cero, negativa y no entera', () => {
    expect(() =>
      validateBatchLabelPreviewInput({ items: [{ id_variante: 'var_1', cantidad: 0 }] }),
    ).toThrow();
    expect(() =>
      validateBatchLabelPreviewInput({ items: [{ id_variante: 'var_1', cantidad: -1 }] }),
    ).toThrow();
    expect(() =>
      validateBatchLabelPreviewInput({ items: [{ id_variante: 'var_1', cantidad: 1.5 }] }),
    ).toThrow();
  });

  it('suma variantes duplicadas', () => {
    expect(
      validateBatchLabelPreviewInput({
        items: [
          { id_variante: 'var_1', cantidad: 2 },
          { id_variante: 'var_2', cantidad: 1 },
          { id_variante: 'var_1', cantidad: 3 },
        ],
      }),
    ).toEqual([
      { idVariante: 'var_1', cantidad: 5 },
      { idVariante: 'var_2', cantidad: 1 },
    ]);
  });

  it('rechaza superar el limite total de etiquetas', () => {
    expect(() =>
      validateBatchLabelPreviewInput({
        items: [{ id_variante: 'var_1', cantidad: MAX_BATCH_LABELS + 1 }],
      }),
    ).toThrow();
  });
});
