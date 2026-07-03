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
