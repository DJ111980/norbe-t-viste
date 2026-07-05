import type { UserRole } from '../auth/auth.types';

export type EntryLotStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
export type EntryLotType = 'COMPRA' | 'ENVIO' | 'INVENTARIO_INICIAL' | 'AJUSTE';

export interface EntryLotRecord {
  id_lote: string;
  id_proveedor: string | null;
  nombre_proveedor: string | null;
  estado_proveedor: 'ACTIVO' | 'INACTIVO' | null;
  creado_por: string;
  actualizado_por: string | null;
  confirmado_por: string | null;
  confirmado_en: string | null;
  anulado_por: string | null;
  anulado_en: string | null;
  motivo_anulacion: string | null;
  numero_lote: string;
  tipo_lote: EntryLotType;
  fecha_lote: string;
  numero_factura_proveedor: string | null;
  numero_guia_envio: string | null;
  modo_envio: string | null;
  empresa_transportadora: string | null;
  costo_envio: number;
  total_compra: number;
  estado_lote: EntryLotStatus;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  cantidad_detalles?: number;
  total_estimado?: number;
}

export interface EntryLotDetailRecord {
  id_detalle_lote: string;
  id_lote: string;
  id_variante: string;
  cantidad: number;
  costo_unitario: number;
  precio_venta_sugerido: number;
  subtotal: number;
  cantidad_etiquetas_qr: number;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  codigo_qr: string;
  talla: string | null;
  color: string | null;
  estado_variante: 'ACTIVA' | 'INACTIVA';
  stock_actual: number;
  id_producto: string;
  nombre_producto: string;
  estado_producto: 'ACTIVO' | 'INACTIVO';
}

export interface ProviderForEntryLot {
  id_proveedor: string;
  nombre_proveedor: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface VariantForEntryLotDetail {
  id_variante: string;
  estado: 'ACTIVA' | 'INACTIVA';
  stock_actual: number;
  id_producto: string;
  nombre_producto: string;
  estado_producto: 'ACTIVO' | 'INACTIVO';
}

export interface CreateEntryLotInput {
  idProveedor: string | null;
  numeroFactura: string | null;
  fechaLote: string;
  observaciones: string | null;
}

export type UpdateEntryLotInput = Partial<CreateEntryLotInput>;

export interface CreateEntryLotDetailInput {
  idVariante: string;
  cantidad: number;
  costoUnitario: number;
  precioVentaSugerido: number;
  cantidadEtiquetasQr?: number;
  observaciones: string | null;
}

export type UpdateEntryLotDetailInput = Partial<Omit<CreateEntryLotDetailInput, 'idVariante'>>;

export interface ListEntryLotsFilters {
  estado?: EntryLotStatus;
  proveedor?: string;
  buscar?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit: number;
  offset: number;
}

export interface PublicEntryLotSummary {
  idLote: string;
  idProveedor: string | null;
  nombreProveedor: string | null;
  numeroLote: string;
  numeroFactura: string | null;
  fechaLote: string;
  estadoLote: EntryLotStatus;
  observaciones: string | null;
  cantidadDetalles: number;
  totalEstimado: number | null;
  creadoPor: string;
  actualizadoPor: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PublicEntryLotDetail {
  idDetalleLote: string;
  variante: {
    idVariante: string;
    codigoQr: string;
    talla: string | null;
    color: string | null;
    stockActual: number;
    estado: 'ACTIVA' | 'INACTIVA';
  };
  producto: {
    idProducto: string;
    nombreProducto: string;
    estado: 'ACTIVO' | 'INACTIVO';
  };
  cantidad: number;
  costoUnitario?: number;
  subtotal?: number;
  precioVentaSugerido: number;
  cantidadEtiquetasQr: number;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PublicEntryLot extends PublicEntryLotSummary {
  proveedor: {
    idProveedor: string;
    nombreProveedor: string;
    estado: 'ACTIVO' | 'INACTIVO';
  } | null;
  confirmadoPor: string | null;
  confirmadoEn: string | null;
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  detalles: PublicEntryLotDetail[];
}

export interface EntryLotMapperOptions {
  role: UserRole;
}

export interface ConfirmEntryLotMovementInput {
  idMovimiento: string;
  idVariante: string;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
}

export interface CancelEntryLotMovementInput extends ConfirmEntryLotMovementInput {
  motivo: string;
}

export interface ConfirmEntryLotResult {
  id_lote: string;
  estado_lote: 'CONFIRMADO';
  detalles_procesados: number;
  movimientos_creados: number;
  total_unidades_ingresadas: number;
}

export interface CancelEntryLotInput {
  motivo: string;
}

export interface CancelEntryLotResult {
  id_lote: string;
  estado_lote: 'ANULADO';
  detalles_procesados: number;
  movimientos_creados: number;
  total_unidades_reversadas: number;
}
