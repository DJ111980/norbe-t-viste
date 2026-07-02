import { describe, expect, it } from 'vitest';
import { toPublicProduct } from './products.mapper';
import type { ProductRecord } from './products.types';

function createProductRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id_producto: 'prd_1',
    id_categoria: 'cat_1',
    nombre_producto: 'Blusa Roja',
    descripcion: null,
    marca: null,
    referencia: null,
    imagen_principal: null,
    mostrar_en_catalogo: 1,
    estado: 'ACTIVO',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: 'usr_admin',
    actualizado_por: 'usr_admin',
    nombre_normalizado: 'blusa roja',
    categoria_nombre: 'Blusas',
    categoria_estado: 'ACTIVA',
    ...overrides,
  };
}

describe('products mapper', () => {
  it('mapper no expone campos innecesarios ni stock', () => {
    const publicProduct = toPublicProduct(createProductRecord());

    expect(publicProduct).not.toHaveProperty('nombre_normalizado');
    expect(publicProduct).not.toHaveProperty('stock');
    expect(publicProduct).not.toHaveProperty('imagenPrincipal');
    expect(publicProduct.visibleCatalogo).toBe(true);
  });
});
