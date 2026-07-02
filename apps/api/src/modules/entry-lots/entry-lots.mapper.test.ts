import { describe, expect, it } from 'vitest';
import { toPublicEntryLotDetail, toPublicEntryLotSummary } from './entry-lots.mapper';
import type { EntryLotDetailRecord, EntryLotRecord } from './entry-lots.types';

const lot: EntryLotRecord = {
  id_lote: 'lot_1',
  id_proveedor: 'prv_1',
  nombre_proveedor: 'Moda Cali',
  estado_proveedor: 'ACTIVO',
  creado_por: 'usr_admin',
  actualizado_por: 'usr_admin',
  confirmado_por: null,
  confirmado_en: null,
  anulado_por: null,
  anulado_en: null,
  motivo_anulacion: null,
  numero_lote: 'NTV-LOT-1',
  tipo_lote: 'COMPRA',
  fecha_lote: '2026-07-02',
  numero_factura_proveedor: 'FAC-1',
  numero_guia_envio: null,
  modo_envio: null,
  empresa_transportadora: null,
  costo_envio: 0,
  total_compra: 0,
  estado_lote: 'BORRADOR',
  observaciones: null,
  creado_en: '2026-07-02',
  actualizado_en: '2026-07-02',
  cantidad_detalles: 1,
  total_estimado: 12000,
};

const detail: EntryLotDetailRecord = {
  id_detalle_lote: 'det_1',
  id_lote: 'lot_1',
  id_variante: 'var_1',
  cantidad: 2,
  costo_unitario: 6000,
  precio_venta_sugerido: 15000,
  subtotal: 12000,
  cantidad_etiquetas_qr: 2,
  observaciones: null,
  creado_en: '2026-07-02',
  actualizado_en: '2026-07-02',
  sku: 'SKU-1',
  codigo_qr: 'NTV-VAR-000001',
  talla: 'M',
  color: 'Azul',
  estado_variante: 'ACTIVA',
  stock_actual: 0,
  id_producto: 'prd_1',
  nombre_producto: 'Blusa',
  estado_producto: 'ACTIVO',
};

describe('entry lots mapper', () => {
  it('muestra costos a ADMINISTRADOR', () => {
    expect(toPublicEntryLotSummary(lot, { role: 'ADMINISTRADOR' }).totalEstimado).toBe(12000);
    expect(toPublicEntryLotDetail(detail, { role: 'ADMINISTRADOR' })).toMatchObject({
      costoUnitario: 6000,
      subtotal: 12000,
    });
  });

  it('oculta costos a VENDEDOR', () => {
    const mappedSummary = toPublicEntryLotSummary(lot, { role: 'VENDEDOR' });
    const mappedDetail = toPublicEntryLotDetail(detail, { role: 'VENDEDOR' });

    expect(mappedSummary.totalEstimado).toBeNull();
    expect(mappedDetail).not.toHaveProperty('costoUnitario');
    expect(mappedDetail).not.toHaveProperty('subtotal');
  });
});
