import { describe, expect, it } from 'vitest';
import { toProductImageResponse, toVariantImageResponse } from './images.mapper';

describe('images mapper', () => {
  it('mapper no expone datos innecesarios de producto', () => {
    const response = toProductImageResponse({
      id_producto: 'prd_1',
      imagen_principal: 'productos/prd_1/principal/a.png',
    });

    expect(response.imagen?.origen).toBe('PRODUCTO');
    expect(response).not.toHaveProperty('binario');
  });

  it('mapper resuelve variante, fallback producto y ninguna', () => {
    expect(
      toVariantImageResponse({
        id_variante: 'var_1',
        imagen_variante: 'variantes/var_1/a.png',
        id_producto: 'prd_1',
        imagen_principal: 'productos/prd_1/principal/a.png',
      }).origen,
    ).toBe('VARIANTE');

    expect(
      toVariantImageResponse({
        id_variante: 'var_1',
        imagen_variante: null,
        id_producto: 'prd_1',
        imagen_principal: 'productos/prd_1/principal/a.png',
      }).origen,
    ).toBe('PRODUCTO');

    expect(
      toVariantImageResponse({
        id_variante: 'var_1',
        imagen_variante: null,
        id_producto: 'prd_1',
        imagen_principal: null,
      }),
    ).toEqual({
      id_variante: 'var_1',
      imagen: null,
      origen: 'NINGUNA',
    });
  });
});
