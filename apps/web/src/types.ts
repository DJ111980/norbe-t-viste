export type UserRole = 'ADMINISTRADOR' | 'VENDEDOR';

export interface AuthUser {
  idUsuario: string;
  nombreCompleto: string;
  correo: string;
  rol: UserRole;
}

export interface DashboardSummary {
  periodo: {
    fechaDesde: string;
    fechaHasta: string;
  };
  ventas: {
    cantidad_total: number;
    total_vendido: number;
    total_contado: number;
    total_credito: number;
    total_mixto: number;
    ventas_anuladas: number;
  };
  pagos: {
    total_recibido: number;
  };
  cartera: {
    saldo_pendiente_total: number;
    creditos_pendientes: number;
    creditos_pagados: number;
    creditos_anulados: number;
  };
  inventario: {
    variantes_total: number;
    variantes_activas: number;
    stock_total: number;
    variantes_sin_stock: number;
    variantes_bajo_stock: number;
  };
  devoluciones: {
    cantidad_total: number;
    total_devuelto: number;
  };
  lotes: {
    lotes_borrador: number;
    lotes_confirmados: number;
    lotes_anulados: number;
  };
  alertas: {
    variantes_sin_qr: number;
    variantes_sin_imagen: number;
    productos_sin_imagen: number;
    creditos_con_saldo: number;
  };
}

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
}

export type CommonStatus = 'ACTIVO' | 'INACTIVO';
export type CategoryStatus = 'ACTIVA' | 'INACTIVA';

export interface Client {
  idCliente: string;
  nombreCompleto: string;
  documento: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  direccion: string | null;
  ciudad: string | null;
  correo: string | null;
  observaciones: string | null;
  estado: CommonStatus;
  actualizadoEn: string;
}

export interface ClientFormValues {
  nombre_completo: string;
  documento: string;
  telefono: string;
  telefono_secundario: string;
  direccion: string;
  ciudad: string;
  correo: string;
  observaciones: string;
}

export type ShippingMode =
  'ENVIO_TRANSPORTADORA' | 'RECOGIDA_EN_LOCAL' | 'DOMICILIO' | 'ENCOMIENDA' | 'OTRO';

export interface Provider {
  idProveedor: string;
  nombreProveedor: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  nombreContacto: string | null;
  telefonoPrincipal: string | null;
  telefonoSecundario: string | null;
  correo: string | null;
  ciudad: string | null;
  direccion: string | null;
  pais: string | null;
  modoEnvio: ShippingMode | null;
  empresaTransportadora: string | null;
  tiempoEntregaEstimado: string | null;
  formaPago: string | null;
  cuentaPago: string | null;
  notas: string | null;
  estado: CommonStatus;
  actualizadoEn: string;
}

export interface ProviderFormValues {
  nombre_proveedor: string;
  tipo_documento: string;
  numero_documento: string;
  nombre_contacto: string;
  telefono_principal: string;
  telefono_secundario: string;
  correo: string;
  ciudad: string;
  direccion: string;
  pais: string;
  modo_envio: string;
  empresa_transportadora: string;
  tiempo_entrega_estimado: string;
  forma_pago: string;
  cuenta_pago: string;
  notas: string;
}

export interface Category {
  idCategoria: string;
  nombreCategoria: string;
  descripcion: string | null;
  estado: CategoryStatus;
  actualizadoEn: string;
}

export interface CategoryFormValues {
  nombre_categoria: string;
  descripcion: string;
}

export type ProductStatus = 'ACTIVO' | 'INACTIVO';
export type VariantStatus = 'ACTIVA' | 'INACTIVA';

export interface Product {
  idProducto: string;
  nombreProducto: string;
  descripcion: string | null;
  marca: string | null;
  referencia: string | null;
  visibleCatalogo: boolean;
  estado: ProductStatus;
  categoria: {
    idCategoria: string;
    nombreCategoria: string | null;
    estado: CategoryStatus | null;
  };
  actualizadoEn: string;
}

export interface ProductFormValues {
  nombre_producto: string;
  id_categoria: string;
  descripcion: string;
  marca: string;
  referencia: string;
  visible_catalogo: boolean;
}

export interface Variant {
  idVariante: string;
  producto: {
    idProducto: string;
    nombreProducto: string | null;
    estadoProducto: ProductStatus | null;
  };
  sku: string;
  codigoQr: string;
  talla: string | null;
  color: string | null;
  precioCompraReferencia: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  estado: VariantStatus;
  actualizadoEn: string;
}

export interface VariantFormValues {
  id_producto: string;
  talla: string;
  color: string;
  sku: string;
  precio_venta: number;
  precio_compra_referencia: number;
  stock_minimo: number;
}

export interface ImageMetadata {
  key: string;
  origen: 'PRODUCTO' | 'VARIANTE';
}

export type InventoryMovementType =
  | 'LOTE_ENTRADA'
  | 'INVENTARIO_INICIAL'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'VENTA'
  | 'ANULACION_VENTA'
  | 'DEVOLUCION';

export type InventoryReferenceType =
  | 'LOTE_ENTRADA'
  | 'INVENTARIO_INICIAL'
  | 'AJUSTE_INVENTARIO'
  | 'VENTA'
  | 'ANULACION_VENTA'
  | 'DEVOLUCION';

export interface InventoryVariant {
  idVariante: string;
  producto: {
    idProducto: string;
    nombreProducto: string;
    estadoProducto: ProductStatus;
    categoria: {
      idCategoria: string;
      nombreCategoria: string | null;
    } | null;
  };
  sku: string;
  codigoQr: string;
  talla: string | null;
  color: string | null;
  precioCompraReferencia?: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  stockBajo: boolean;
  sinStock: boolean;
  estado: VariantStatus;
}

export interface InventoryMovement {
  idMovimiento: string;
  tipoMovimiento: InventoryMovementType;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  referenciaTipo: InventoryReferenceType | null;
  referenciaId: string | null;
  motivo: string | null;
  creadoPor: string;
  creadoEn: string;
  variante: {
    idVariante: string;
    sku: string;
    codigoQr: string;
    talla: string | null;
    color: string | null;
  };
  producto: {
    idProducto: string;
    nombreProducto: string;
  };
}

export interface InitialInventoryFormValues {
  id_variante: string;
  cantidad_inicial: number;
  motivo: string;
}

export interface InventoryAdjustmentFormValues {
  id_variante: string;
  tipo_ajuste: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  cantidad: number;
  motivo: string;
}

export type EntryLotStatus = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';

export interface EntryLotSummary {
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

export interface EntryLotDetail {
  idDetalleLote: string;
  variante: {
    idVariante: string;
    sku: string;
    codigoQr: string;
    talla: string | null;
    color: string | null;
    stockActual: number;
    estado: VariantStatus;
  };
  producto: {
    idProducto: string;
    nombreProducto: string;
    estado: ProductStatus;
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

export interface EntryLot extends EntryLotSummary {
  proveedor: {
    idProveedor: string;
    nombreProveedor: string;
    estado: CommonStatus;
  } | null;
  confirmadoPor: string | null;
  confirmadoEn: string | null;
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  detalles: EntryLotDetail[];
}

export interface EntryLotFormValues {
  id_proveedor: string;
  numero_factura: string;
  fecha_lote: string;
  observaciones: string;
}

export interface EntryLotDetailFormValues {
  id_variante: string;
  cantidad: number;
  costo_unitario: number;
  precio_venta_sugerido: number;
  cantidad_etiquetas_qr: number;
  observaciones: string;
}

export type SaleType = 'CONTADO' | 'CREDITO' | 'MIXTA';
export type SaleStatus = 'COMPLETADA' | 'ANULADA';
export type PaymentMethod =
  'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';

export interface SaleSummary {
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

export interface SaleLine {
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

export interface SalePayment {
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

export interface SaleDetail extends SaleSummary {
  subtotal: number;
  descuento: number;
  valorPagadoInicial: number;
  observaciones: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  actualizadoEn: string;
  detalles: SaleLine[];
  pagos: SalePayment[];
  resumen: {
    subtotal: number;
    descuento: number;
    total: number;
    saldoPendiente: number;
    cantidadItems: number;
    pagosRegistrados: number;
  };
}

export interface SaleItemFormValues {
  id_variante: string;
  cantidad: number;
  precio_unitario: number;
}

export interface SaleFormValues {
  tipo_venta: SaleType;
  id_cliente: string;
  metodo_pago: PaymentMethod;
  valor_pagado_inicial: number;
  observaciones: string;
  detalles: SaleItemFormValues[];
}

export type CreditOrigin = 'VENTA' | 'DEUDA_ANTIGUA' | 'AJUSTE_MANUAL';
export type OldDebtType = 'SOLO_MONTO' | 'CON_PRODUCTOS';
export type CreditStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO' | 'ANULADO';
export type CreditAdjustmentType = 'AUMENTO' | 'DESCUENTO' | 'CORRECCION';

export interface CreditClientInfo {
  idCliente: string;
  nombreCompleto: string;
  documento: string | null;
  telefono: string | null;
}

export interface CreditSummary {
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
  cliente: CreditClientInfo;
}

export interface CreditPayment {
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

export interface CreditAdjustment {
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

export interface CreditLine {
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

export interface CreditDetail extends CreditSummary {
  idVenta: string | null;
  venta: {
    id_venta: string;
    numero_venta: string;
    tipo_venta: SaleType;
    estado_venta: SaleStatus;
    total: number;
  } | null;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
  detalles: CreditLine[];
  abonos: CreditPayment[];
  ajustes: CreditAdjustment[];
  resumen: {
    montoInicial: number;
    montoAbonado: number;
    saldoPendiente: number;
    estadoCredito: CreditStatus;
  };
}

export interface OldDebtFormValues {
  id_cliente: string;
  monto_inicial: number;
  descripcion: string;
  tipo_deuda_antigua: OldDebtType;
}

export interface CreditPaymentFormValues {
  valor_abono: number;
  metodo_pago: PaymentMethod;
  referencia_pago: string;
  observaciones: string;
}

export interface CreditAdjustmentFormValues {
  tipo_ajuste: CreditAdjustmentType;
  valor_ajuste: number;
  saldo_final: number;
  motivo: string;
}

export interface PortfolioCredit {
  idCredito: string;
  idVenta: string | null;
  origenCredito: CreditOrigin;
  descripcionCredito: string | null;
  montoInicial: number;
  montoAbonado: number;
  saldoPendiente: number;
  fechaCredito: string;
  estadoCredito: CreditStatus;
  cliente: CreditClientInfo;
}

export interface PortfolioSummary {
  totalCreditos: number;
  creditosPendientes: number;
  creditosParciales: number;
  creditosPagados: number;
  creditosAnulados: number;
  totalMontoInicial: number;
  totalMontoAbonado: number;
  totalSaldoPendiente: number;
  clientesConDeuda: number;
}

export interface Portfolio {
  resumen: PortfolioSummary;
  creditos: PortfolioCredit[];
  paginacion: {
    limit: number;
    offset: number;
  };
}

export interface ClientPortfolio {
  cliente: CreditClientInfo & {
    estado: CommonStatus;
  };
  resumen: {
    totalCreditos: number;
    totalMontoInicial: number;
    totalMontoAbonado: number;
    totalSaldoPendiente: number;
    ultimoCreditoEn: string | null;
  };
  creditosActivos: PortfolioCredit[];
  creditosPagados: PortfolioCredit[];
  creditosAnulados: PortfolioCredit[];
  ultimoAbono: {
    idAbono: string;
    idCredito: string;
    valorAbono: number;
    metodoPago: PaymentMethod;
    fechaAbono: string;
    creadoEn: string;
  } | null;
}

export type SaleReturnStatus = 'ACTIVA' | 'ANULADA';

export interface SaleReturnDetail {
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

export interface SaleReturn {
  idDevolucion: string;
  idVenta: string;
  tipoVenta: SaleType;
  motivo: string;
  estadoDevolucion: SaleReturnStatus;
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
  detalles: SaleReturnDetail[];
}

export interface SaleReturnItemFormValues {
  id_detalle_venta: string;
  cantidad_devuelta: number;
}

export interface SaleReturnFormValues {
  motivo: string;
  detalles: SaleReturnItemFormValues[];
}

export interface CreateSaleReturnResult {
  id_devolucion: string;
  id_venta: string;
  tipo_venta: SaleType;
  estado_devolucion: 'ACTIVA';
  total_devuelto: number;
  impacto_credito: number;
  impacto_pago: number;
  items_devueltos: number;
  movimientos_creados: number;
}
