import { describe, expect, it } from 'vitest';
import { toPublicVariant } from './variants.mapper';
import type { VariantRecord } from './variants.types';

function createVariantRecord(overrides: Partial<VariantRecord> = {}): VariantRecord {
  return {
    id_variante: 'var_1',
    id_producto: 'prd_1',
    codigo_qr: 'NTV-VAR-000001',
    ruta_qr: null,
    talla: 'M',
    color: 'Rojo',
    talla_normalizada: 'm',
    color_normalizado: 'rojo',
    precio_compra: 20000,
    precio_venta: 50000,
    stock_actual: 0,
    stock_minimo: 1,
    imagen_variante: null,
    mostrar_en_catalogo: 0,
    estado: 'ACTIVA',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: 'usr_admin',
    actualizado_por: 'usr_admin',
    nombre_producto: 'Blusa Roja',
    estado_producto: 'ACTIVO',
    ...overrides,
  };
}

describe('variants mapper', () => {
  it('mapper expone stock de variante pero no stock de producto base', () => {
    const publicVariant = toPublicVariant(createVariantRecord());

    expect(publicVariant.stockActual).toBe(0);
    expect(publicVariant).not.toHaveProperty('stockProducto');
    expect(publicVariant).not.toHaveProperty('imagen_variante');
    expect(publicVariant.codigoQr).toBe('NTV-VAR-000001');
  });
});
