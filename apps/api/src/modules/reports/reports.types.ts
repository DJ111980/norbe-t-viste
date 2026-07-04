export interface PaginationInput {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

export interface PaginatedReport<TItem, TTotals> {
  items: TItem[];
  totales: TTotals;
  paginacion: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface SalesReportFilters extends PaginationInput {
  fechaDesde?: string;
  fechaHasta?: string;
  tipoVenta?: 'CONTADO' | 'CREDITO' | 'MIXTA';
  estadoVenta?: 'COMPLETADA' | 'ANULADA';
  idCliente?: string;
  idUsuario?: string;
}

export interface SalesReportRow {
  id_venta: string;
  numero_venta: string;
  id_cliente: string | null;
  cliente_nombre: string | null;
  id_usuario: string;
  usuario_nombre: string | null;
  tipo_venta: string;
  estado_venta: string;
  subtotal: number;
  descuento: number;
  total: number;
  valor_pagado_inicial: number;
  saldo_pendiente: number;
  creado_en: string;
}

export interface SalesReportTotals {
  cantidad_total: number;
  total_vendido: number;
  total_bruto: number;
  total_descuento: number;
  ventas_anuladas: number;
}

export interface InventoryReportFilters extends PaginationInput {
  q?: string;
  idProducto?: string;
  idCategoria?: string;
  estadoVariante?: 'ACTIVA' | 'INACTIVA';
  bajoStock?: boolean;
  sinStock?: boolean;
}

export interface InventoryReportRow {
  id_variante: string;
  id_producto: string;
  nombre_producto: string;
  id_categoria: string | null;
  nombre_categoria: string | null;
  talla: string | null;
  color: string | null;
  sku: string;
  codigo_qr: string;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
}

export interface InventoryReportTotals {
  variantes_total: number;
  stock_total: number;
}

export interface InventoryMovementReportFilters extends PaginationInput {
  fechaDesde?: string;
  fechaHasta?: string;
  idVariante?: string;
  tipoMovimiento?:
    | 'LOTE_ENTRADA'
    | 'INVENTARIO_INICIAL'
    | 'AJUSTE_POSITIVO'
    | 'AJUSTE_NEGATIVO'
    | 'VENTA'
    | 'ANULACION_VENTA'
    | 'DEVOLUCION';
  referenciaTipo?:
    | 'LOTE_ENTRADA'
    | 'INVENTARIO_INICIAL'
    | 'AJUSTE_INVENTARIO'
    | 'VENTA'
    | 'ANULACION_VENTA'
    | 'DEVOLUCION';
  referenciaId?: string;
}

export interface InventoryMovementReportRow {
  id_movimiento: string;
  id_variante: string;
  sku: string;
  codigo_qr: string;
  tipo_movimiento: string;
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  referencia_tipo: string | null;
  referencia_id: string | null;
  usuario_nombre: string | null;
  creado_en: string;
}

export interface InventoryMovementReportTotals {
  cantidad_movimientos: number;
}

export interface PortfolioReportFilters extends PaginationInput {
  idCliente?: string;
  estadoCredito?: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO' | 'ANULADO';
  origenCredito?: 'VENTA' | 'DEUDA_ANTIGUA' | 'AJUSTE_MANUAL';
}

export interface PortfolioReportRow {
  id_credito: string;
  id_cliente: string;
  cliente_nombre: string | null;
  id_venta: string | null;
  monto_original: number;
  monto_abonado: number;
  saldo_pendiente: number;
  estado_credito: string;
  origen_credito: string;
  fecha_credito: string;
}

export interface PortfolioReportTotals {
  cantidad_creditos: number;
  saldo_activo: number;
  monto_original: number;
}

export interface ReturnsReportFilters extends PaginationInput {
  fechaDesde?: string;
  fechaHasta?: string;
  tipoVenta?: 'CONTADO' | 'CREDITO' | 'MIXTA';
  estadoDevolucion?: 'ACTIVA' | 'ANULADA';
  idVenta?: string;
}

export interface ReturnsReportRow {
  id_devolucion: string;
  id_venta: string;
  numero_venta: string | null;
  tipo_venta: string;
  estado_devolucion: string;
  total_devuelto: number;
  impacto_credito: number;
  impacto_pago: number;
  cantidad_detalles: number;
  creado_en: string;
}

export interface ReturnsReportTotals {
  cantidad_total: number;
  total_devuelto: number;
  impacto_credito: number;
  impacto_pago: number;
}

export interface EntryLotsReportFilters extends PaginationInput {
  fechaDesde?: string;
  fechaHasta?: string;
  estadoLote?: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
  idProveedor?: string;
}

export interface EntryLotsReportRow {
  id_lote: string;
  numero_lote: string;
  estado_lote: string;
  id_proveedor: string | null;
  nombre_proveedor: string | null;
  fecha_lote: string;
  total_compra: number;
  cantidad_detalles: number;
  creado_en: string;
}

export interface EntryLotsReportTotals {
  cantidad_lotes: number;
  total_compra: number;
  cantidad_detalles: number;
}
