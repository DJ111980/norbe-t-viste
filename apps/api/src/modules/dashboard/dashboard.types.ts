export interface DashboardDateRange {
  fechaDesde: string;
  fechaHasta: string;
}

export interface DashboardSalesSummary {
  cantidad_total: number;
  total_vendido: number;
  total_contado: number;
  total_credito: number;
  total_mixto: number;
  ventas_anuladas: number;
}

export interface DashboardPaymentsSummary {
  total_recibido: number;
}

export interface DashboardPortfolioSummary {
  saldo_pendiente_total: number;
  creditos_pendientes: number;
  creditos_pagados: number;
  creditos_anulados: number;
}

export interface DashboardInventorySummary {
  variantes_total: number;
  variantes_activas: number;
  stock_total: number;
  variantes_sin_stock: number;
  variantes_bajo_stock: number;
}

export interface DashboardReturnsSummary {
  cantidad_total: number;
  total_devuelto: number;
}

export interface DashboardEntryLotsSummary {
  lotes_borrador: number;
  lotes_confirmados: number;
  lotes_anulados: number;
}

export interface DashboardAlertsSummary {
  variantes_sin_qr: number;
  variantes_sin_imagen: number;
  productos_sin_imagen: number;
  creditos_con_saldo: number;
}

export interface DashboardSummary {
  periodo: DashboardDateRange;
  ventas: DashboardSalesSummary;
  pagos: DashboardPaymentsSummary;
  cartera: DashboardPortfolioSummary;
  inventario: DashboardInventorySummary;
  devoluciones: DashboardReturnsSummary;
  lotes: DashboardEntryLotsSummary;
  alertas: DashboardAlertsSummary;
}
