export type SaleType = 'CONTADO' | 'CREDITO' | 'MIXTA';
export type SaleStatus = 'COMPLETADA' | 'ANULADA';
export type PaymentMethod =
  'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';

export interface CreateCashSaleDetailInput {
  idVariante: string;
  cantidad: number;
  precioUnitario?: number;
}

export interface CreateCashSaleInput {
  tipoVenta: 'CONTADO';
  idCliente: string | null;
  metodoPago: PaymentMethod;
  observaciones: string | null;
  detalles: CreateCashSaleDetailInput[];
}

export interface CancelCashSaleInput {
  motivoAnulacion: string;
}

export interface SaleVariantRecord {
  id_variante: string;
  id_producto: string;
  sku: string;
  codigo_qr: string;
  talla: string | null;
  color: string | null;
  precio_venta: number;
  stock_actual: number;
  estado: 'ACTIVA' | 'INACTIVA';
  nombre_producto: string;
  estado_producto: 'ACTIVO' | 'INACTIVO';
}

export interface VariantStockRecord {
  id_variante: string;
  stock_actual: number;
}

export interface SaleClientRecord {
  id_cliente: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface SaleRecord {
  id_venta: string;
  numero_venta: string;
  id_cliente: string | null;
  id_usuario: string;
  tipo_venta: SaleType;
  subtotal: number;
  descuento: number;
  total: number;
  valor_pagado_inicial: number;
  saldo_pendiente: number;
  estado_venta: SaleStatus;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface SaleListRecord extends SaleRecord {
  cliente_nombre: string | null;
  vendedor_nombre: string;
  vendedor_correo: string;
  cantidad_items: number;
}

export interface SaleDetailRecord {
  id_detalle_venta: string;
  id_venta: string;
  id_variante: string;
  codigo_qr: string;
  nombre_producto: string;
  sku: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  creado_en: string;
}

export interface SalePaymentRecord {
  id_pago_venta: string;
  id_venta: string;
  metodo_pago: PaymentMethod;
  valor_pagado: number;
  referencia_pago: string | null;
  observaciones: string | null;
  creado_en: string;
  id_usuario: string | null;
  estado_pago: 'ACTIVO' | 'ANULADO';
  anulado_en: string | null;
  motivo_anulacion: string | null;
  usuario_nombre: string | null;
  usuario_correo: string | null;
}

export interface SaleDetailViewRecord extends SaleListRecord {
  detalles: SaleDetailRecord[];
  pagos: SalePaymentRecord[];
}

export interface ListSalesFilters {
  buscar?: string;
  estado?: SaleStatus;
  tipoVenta?: SaleType;
  cliente?: string;
  vendedor?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit: number;
  offset: number;
}

export interface PublicSaleSummary {
  idVenta: string;
  numeroVenta: string;
  tipoVenta: SaleType;
  estadoVenta: SaleStatus;
  total: number;
  saldoPendiente: number;
  cliente: {
    idCliente: string;
    nombreCompleto: string | null;
  } | null;
  vendedor: {
    idUsuario: string;
    nombreCompleto: string;
    correo: string;
  };
  creadoEn: string;
  cantidadItems: number;
}

export interface PublicSaleDetail extends PublicSaleSummary {
  subtotal: number;
  descuento: number;
  valorPagadoInicial: number;
  observaciones: string | null;
  actualizadoEn: string;
  detalles: PublicSaleLine[];
  pagos: PublicSalePayment[];
  resumen: {
    subtotal: number;
    descuento: number;
    total: number;
    saldoPendiente: number;
    cantidadItems: number;
    pagosRegistrados: number;
  };
}

export interface PublicSaleLine {
  idDetalle: string;
  idVariante: string;
  nombreProducto: string;
  sku: string;
  codigoQr: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PublicSalePayment {
  idPago: string;
  idVenta: string;
  metodoPago: PaymentMethod;
  monto: number;
  estadoPago: 'ACTIVO' | 'ANULADO';
  usuario: {
    idUsuario: string;
    nombreCompleto: string | null;
    correo: string | null;
  } | null;
  creadoEn: string;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
}

export interface SaleDetailToCreate {
  idDetalleVenta: string;
  idVariante: string;
  codigoQr: string;
  nombreProducto: string;
  sku: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  stockAntes: number;
  stockDespues: number;
  idMovimiento: string;
}

export interface CreateCashSaleRepositoryInput {
  idVenta: string;
  numeroVenta: string;
  idCliente: string | null;
  idUsuario: string;
  metodoPago: PaymentMethod;
  observaciones: string | null;
  subtotal: number;
  total: number;
  idPagoVenta: string;
  detalles: SaleDetailToCreate[];
}

export interface CashSalePersistenceStatus {
  saleExists: boolean;
  paymentExists: boolean;
  movementCount: number;
  detailsCount: number;
}

export interface CancelSaleMovementInput {
  idMovimiento: string;
  idVariante: string;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
}

export interface CancelCashSaleRepositoryInput {
  idVenta: string;
  idUsuario: string;
  motivoAnulacion: string;
  movimientos: CancelSaleMovementInput[];
}

export interface CancelSalePersistenceStatus {
  saleCancelled: boolean;
  activePaymentsCount: number;
  cancelledPaymentsCount: number;
  cancellationMovementCount: number;
}

export interface CreateCashSaleResult {
  id_venta: string;
  numero_venta: string;
  tipo_venta: 'CONTADO';
  estado_venta: 'COMPLETADA';
  total: number;
  saldo_pendiente: 0;
  items_vendidos: number;
  movimientos_creados: number;
  pago: {
    metodo_pago: PaymentMethod;
    valor_pagado: number;
  };
}

export interface CancelCashSaleResult {
  id_venta: string;
  estado_venta: 'ANULADA';
  items_revertidos: number;
  movimientos_creados: number;
  pagos_anulados: number;
  total_unidades_devuelto: number;
}
