import type { SaleStatus, SaleType } from '../sales/sales.types';

export interface CreateSaleReturnDetailInput {
  idDetalleVenta: string;
  cantidadDevuelta: number;
}

export interface CreateSaleReturnInput {
  motivo: string;
  detalles: CreateSaleReturnDetailInput[];
}

export interface ReturnSaleRecord {
  id_venta: string;
  tipo_venta: SaleType;
  estado_venta: SaleStatus;
}

export interface ReturnSaleDetailAvailabilityRecord {
  id_detalle_venta: string;
  id_venta: string;
  id_variante: string;
  cantidad: number;
  precio_unitario: number;
  cantidad_devuelta_activa: number;
  stock_actual: number;
}

export interface SaleReturnDetailToCreate {
  idDetalleDevolucion: string;
  idDetalleVenta: string;
  idVariante: string;
  cantidadDevuelta: number;
  precioUnitario: number;
  subtotalDevuelto: number;
  stockAntes: number;
  stockDespues: number;
  idMovimiento: string;
}

export interface CreateSaleReturnRepositoryInput {
  idDevolucion: string;
  idVenta: string;
  tipoVenta: 'CONTADO';
  motivo: string;
  totalDevuelto: number;
  impactoCredito: 0;
  impactoPago: number;
  creadoPor: string;
  detalles: SaleReturnDetailToCreate[];
}

export interface SaleReturnPersistenceStatus {
  returnExists: boolean;
  detailsCount: number;
  movementCount: number;
  stockMatchesCount: number;
  saleStatus: SaleStatus | null;
  paymentCount: number;
  creditCount: number;
  creditPaymentCount: number;
  creditAdjustmentCount: number;
}

export interface SaleReturnRecord {
  id_devolucion: string;
  id_venta: string;
  tipo_venta: SaleType;
  motivo: string;
  estado_devolucion: 'ACTIVA' | 'ANULADA';
  total_devuelto: number;
  impacto_credito: number;
  impacto_pago: number;
  creado_por: string;
  creado_en: string;
  anulado_por: string | null;
  anulado_en: string | null;
  motivo_anulacion: string | null;
  creado_por_nombre: string | null;
  creado_por_correo: string | null;
}

export interface SaleReturnDetailRecord {
  id_detalle_devolucion: string;
  id_devolucion: string;
  id_detalle_venta: string;
  id_variante: string;
  cantidad_devuelta: number;
  precio_unitario: number;
  subtotal_devuelto: number;
  stock_antes: number;
  stock_despues: number;
  id_movimiento: string;
  creado_en: string;
}

export interface SaleReturnViewRecord extends SaleReturnRecord {
  detalles: SaleReturnDetailRecord[];
}

export interface CreateSaleReturnResult {
  id_devolucion: string;
  id_venta: string;
  tipo_venta: 'CONTADO';
  estado_devolucion: 'ACTIVA';
  total_devuelto: number;
  impacto_credito: 0;
  impacto_pago: number;
  items_devueltos: number;
  movimientos_creados: number;
}

export interface PublicSaleReturn {
  idDevolucion: string;
  idVenta: string;
  tipoVenta: SaleType;
  motivo: string;
  estadoDevolucion: 'ACTIVA' | 'ANULADA';
  totalDevuelto: number;
  impactoCredito: number;
  impactoPago: number;
  creadoPor: {
    idUsuario: string;
    nombreCompleto: string | null;
    correo: string | null;
  };
  creadoEn: string;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  detalles: SaleReturnDetailRecord[];
}
