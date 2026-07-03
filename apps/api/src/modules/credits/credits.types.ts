export type CreditOrigin = 'VENTA' | 'DEUDA_ANTIGUA' | 'AJUSTE_MANUAL';
export type OldDebtType = 'SOLO_MONTO' | 'CON_PRODUCTOS';
export type CreditStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO' | 'ANULADO';
export type PaymentMethod =
  'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';
export type CreditAdjustmentType = 'AUMENTO' | 'DESCUENTO' | 'ANULACION' | 'CORRECCION';

export interface CreditClientRecord {
  id_cliente: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface CreditSaleRecord {
  id_venta: string;
  numero_venta: string;
  tipo_venta: string;
  estado_venta: string;
  total: number;
  saldo_pendiente: number;
}

export interface CreditRecord {
  id_credito: string;
  id_cliente: string;
  id_venta: string | null;
  id_usuario: string;
  origen_credito: CreditOrigin;
  tipo_deuda_antigua: OldDebtType | null;
  descripcion_credito: string | null;
  monto_inicial: number;
  monto_abonado: number;
  saldo_pendiente: number;
  fecha_credito: string;
  fecha_vencimiento: string | null;
  estado_credito: CreditStatus;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  actualizado_por: string | null;
  anulado_por: string | null;
  anulado_en: string | null;
  motivo_anulacion: string | null;
  cliente_nombre: string;
  cliente_documento: string | null;
  cliente_telefono: string | null;
}

export interface CreditDetailRecord {
  id_detalle_credito: string;
  id_credito: string;
  id_variante: string | null;
  nombre_producto: string;
  sku: string | null;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones: string | null;
  creado_en: string;
}

export interface CreditPaymentRecord {
  id_abono: string;
  id_credito: string;
  id_cliente: string;
  id_usuario: string;
  valor_abono: number;
  metodo_pago: PaymentMethod;
  referencia_pago: string | null;
  fecha_abono: string;
  observaciones: string | null;
  creado_en: string;
  estado_abono: 'ACTIVO' | 'ANULADO';
  anulado_en: string | null;
  motivo_anulacion: string | null;
  usuario_nombre: string | null;
}

export interface CreditAdjustmentRecord {
  id_ajuste: string;
  id_credito: string;
  id_usuario: string;
  tipo_ajuste: CreditAdjustmentType;
  valor_ajuste: number;
  saldo_antes: number;
  saldo_despues: number;
  motivo: string;
  creado_en: string;
  usuario_nombre: string | null;
}

export interface CreditDetailViewRecord extends CreditRecord {
  venta: CreditSaleRecord | null;
  detalles: CreditDetailRecord[];
  abonos: CreditPaymentRecord[];
  ajustes: CreditAdjustmentRecord[];
}

export interface ListCreditsFilters {
  cliente?: string;
  estado?: CreditStatus;
  origenCredito?: CreditOrigin;
  saldoPendiente?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  limit: number;
  offset: number;
}

export interface ListClientCreditsFilters {
  estado?: CreditStatus;
  origenCredito?: CreditOrigin;
  saldoPendiente?: boolean;
  limit: number;
  offset: number;
}

export interface CreateOldDebtInput {
  idCliente: string;
  montoInicial: number;
  descripcion: string;
  tipoDeudaAntigua: OldDebtType;
}

export interface CreateCreditPaymentInput {
  valorAbono: number;
  metodoPago: PaymentMethod;
  referenciaPago: string | null;
  observaciones: string | null;
}

export interface CreateCreditAdjustmentInput {
  tipoAjuste: Extract<CreditAdjustmentType, 'AUMENTO' | 'DESCUENTO' | 'CORRECCION'>;
  valorAjuste?: number;
  saldoFinal?: number;
  motivo: string;
}

export interface CancelCreditPaymentInput {
  motivoAnulacion: string;
}

export interface CancelCreditInput {
  motivoAnulacion: string;
}

export interface CreateCreditPaymentRepositoryInput extends CreateCreditPaymentInput {
  idAbono: string;
  idCredito: string;
  idCliente: string;
  idUsuario: string;
  saldoNuevo: number;
  estadoCredito: Extract<CreditStatus, 'PARCIAL' | 'PAGADO'>;
}

export interface CreateCreditAdjustmentRepositoryInput {
  idAjuste: string;
  idCredito: string;
  idUsuario: string;
  tipoAjuste: Extract<CreditAdjustmentType, 'AUMENTO' | 'DESCUENTO' | 'CORRECCION'>;
  valorAjuste: number;
  saldoAntes: number;
  saldoDespues: number;
  motivo: string;
  montoAbonadoActual: number;
  estadoCredito: Extract<CreditStatus, 'PENDIENTE' | 'PARCIAL' | 'PAGADO'>;
}

export interface CancelCreditPaymentRepositoryInput {
  idCredito: string;
  idAbono: string;
  idUsuario: string;
  valorAbono: number;
  saldoAntes: number;
  saldoDespues: number;
  montoAbonadoAntes: number;
  montoAbonadoDespues: number;
  estadoCredito: Extract<CreditStatus, 'PENDIENTE' | 'PARCIAL' | 'PAGADO'>;
  motivoAnulacion: string;
}

export interface CancelCreditRepositoryInput {
  idCredito: string;
  idUsuario: string;
  saldoAnterior: number;
  montoInicial: number;
  montoAbonado: number;
  motivoAnulacion: string;
}

export interface CreditActivityCounts {
  paymentsCount: number;
  adjustmentsCount: number;
}

export interface CreditPaymentPersistenceStatus {
  creditSaldoPendiente: number | null;
  creditMontoAbonado: number | null;
  creditEstado: CreditStatus | null;
  paymentExists: boolean;
}

export interface CreditAdjustmentPersistenceStatus {
  creditSaldoPendiente: number | null;
  creditMontoAbonado: number | null;
  creditEstado: CreditStatus | null;
  adjustmentExists: boolean;
}

export interface CreditPaymentCancellationPersistenceStatus {
  creditSaldoPendiente: number | null;
  creditMontoAbonado: number | null;
  creditEstado: CreditStatus | null;
  paymentCancelled: boolean;
  paymentCancelledBy: string | null;
  paymentCancelledAt: string | null;
  paymentCancellationReason: string | null;
}

export interface CreditCancellationPersistenceStatus {
  creditSaldoPendiente: number | null;
  creditMontoInicial: number | null;
  creditMontoAbonado: number | null;
  creditEstado: CreditStatus | null;
  creditCancelledBy: string | null;
  creditCancelledAt: string | null;
  creditCancellationReason: string | null;
}

export interface PublicCreditSummary {
  idCredito: string;
  origenCredito: CreditOrigin;
  tipoDeudaAntigua: OldDebtType | null;
  descripcionCredito: string | null;
  montoInicial: number;
  montoAbonado: number;
  saldoPendiente: number;
  fechaCredito: string;
  fechaVencimiento: string | null;
  estadoCredito: CreditStatus;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  cliente: {
    idCliente: string;
    nombreCompleto: string;
    documento: string | null;
    telefono: string | null;
  };
}

export interface PublicCreditDetail extends PublicCreditSummary {
  idVenta: string | null;
  venta: CreditSaleRecord | null;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
  detalles: CreditDetailRecord[];
  abonos: CreditPaymentRecord[];
  ajustes: CreditAdjustmentRecord[];
  resumen: {
    montoInicial: number;
    montoAbonado: number;
    saldoPendiente: number;
    estadoCredito: CreditStatus;
  };
}

export interface CreateOldDebtResult {
  id_credito: string;
  id_cliente: string;
  origen_credito: 'DEUDA_ANTIGUA';
  tipo_deuda_antigua: OldDebtType;
  monto_inicial: number;
  monto_abonado: 0;
  saldo_pendiente: number;
  estado_credito: 'PENDIENTE';
}

export interface CreateCreditPaymentResult {
  id_credito: string;
  id_abono: string;
  valor_abono: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  estado_credito: Extract<CreditStatus, 'PARCIAL' | 'PAGADO'>;
}

export interface CreateCreditAdjustmentResult {
  id_credito: string;
  id_ajuste: string;
  tipo_ajuste: Extract<CreditAdjustmentType, 'AUMENTO' | 'DESCUENTO' | 'CORRECCION'>;
  valor_ajuste: number;
  saldo_antes: number;
  saldo_despues: number;
  estado_credito: Extract<CreditStatus, 'PENDIENTE' | 'PARCIAL' | 'PAGADO'>;
}

export interface CancelCreditPaymentResult {
  id_credito: string;
  id_abono: string;
  estado_abono: 'ANULADO';
  valor_abono_anulado: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  monto_abonado_anterior: number;
  monto_abonado_nuevo: number;
  estado_credito: Extract<CreditStatus, 'PENDIENTE' | 'PARCIAL' | 'PAGADO'>;
}

export interface CancelCreditResult {
  id_credito: string;
  estado_credito: 'ANULADO';
  saldo_anterior: number;
  saldo_nuevo: 0;
  monto_inicial: number;
  monto_abonado: number;
}
