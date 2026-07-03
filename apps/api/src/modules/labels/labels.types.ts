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
