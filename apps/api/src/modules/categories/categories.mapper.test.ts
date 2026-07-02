import { describe, expect, it } from 'vitest';
import { toPublicCategory } from './categories.mapper';
import type { CategoryRecord } from './categories.types';

function createCategoryRecord(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id_categoria: 'cat_1',
    nombre_categoria: 'Blusas',
    descripcion: null,
    estado: 'ACTIVA',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: 'usr_admin',
    actualizado_por: 'usr_admin',
    nombre_normalizado: 'blusas',
    ...overrides,
  };
}

describe('categories mapper', () => {
  it('mapper no expone campos innecesarios', () => {
    const publicCategory = toPublicCategory(createCategoryRecord());

    expect(publicCategory).not.toHaveProperty('nombre_normalizado');
    expect(publicCategory).not.toHaveProperty('nombreNormalizado');
    expect(publicCategory).not.toHaveProperty('productos');
  });
});
