import { describe, expect, it } from 'vitest';
import { isValidLabelQuantity } from './LabelsPage';

describe('LabelsPage rules', () => {
  it('valida cantidades positivas para etiquetas por lista', () => {
    expect(isValidLabelQuantity(1)).toBe(true);
    expect(isValidLabelQuantity(0)).toBe(false);
    expect(isValidLabelQuantity(-1)).toBe(false);
    expect(isValidLabelQuantity(1.5)).toBe(false);
  });
});
