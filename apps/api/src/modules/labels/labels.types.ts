export interface LabelVariantRecord {
  id_variante: string;
  codigo_qr: string | null;
  talla: string | null;
  estado: 'ACTIVA' | 'INACTIVA';
  estado_producto: 'ACTIVO' | 'INACTIVO';
}

export interface PrintableVariantLabel {
  codigoQr: string;
  talla: string;
  qrSvg: string;
}

export interface BatchLabelItemInput {
  idVariante: string;
  cantidad: number;
}

export interface EntryLotForLabelsRecord {
  id_lote: string;
  estado_lote: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
}

export interface EntryLotDetailForLabelsRecord {
  id_detalle_lote: string;
  id_variante: string;
  cantidad: number;
  cantidad_etiquetas_qr: number | null;
  variante_id_variante: string | null;
  codigo_qr: string | null;
  talla: string | null;
  estado_variante: 'ACTIVA' | 'INACTIVA' | null;
  estado_producto: 'ACTIVO' | 'INACTIVO' | null;
}
