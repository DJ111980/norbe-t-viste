import type { CreditOrigin, CreditStatus } from '../credits/credits.types';

export interface PortfolioFilters {
  cliente?: string;
  estado?: CreditStatus;
  origenCredito?: CreditOrigin;
  saldoPendiente?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  limit: number;
  offset: number;
}

export interface PortfolioCreditRecord {
  id_credito: string;
  id_cliente: string;
  id_venta: string | null;
  origen_credito: CreditOrigin;
  descripcion_credito: string | null;
  monto_inicial: number;
  monto_abonado: number;
  saldo_pendiente: number;
  fecha_credito: string;
  estado_credito: CreditStatus;
  cliente_nombre: string;
  cliente_documento: string | null;
  cliente_telefono: string | null;
}

export interface PortfolioSummaryRecord {
  total_creditos: number;
  creditos_pendientes: number;
  creditos_parciales: number;
  creditos_pagados: number;
  creditos_anulados: number;
  total_monto_inicial: number;
  total_monto_abonado: number;
  total_saldo_pendiente: number;
  clientes_con_deuda: number;
}

export interface PortfolioClientRecord {
  id_cliente: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface PortfolioPaymentRecord {
  id_abono: string;
  id_credito: string;
  valor_abono: number;
  metodo_pago: string;
  fecha_abono: string;
  creado_en: string;
}

export interface PublicPortfolioCredit {
  idCredito: string;
  idVenta: string | null;
  origenCredito: CreditOrigin;
  descripcionCredito: string | null;
  montoInicial: number;
  montoAbonado: number;
  saldoPendiente: number;
  fechaCredito: string;
  estadoCredito: CreditStatus;
  cliente: {
    idCliente: string;
    nombreCompleto: string;
    documento: string | null;
    telefono: string | null;
  };
}

export interface PublicPortfolioSummary {
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

export interface PublicPortfolio {
  resumen: PublicPortfolioSummary;
  creditos: PublicPortfolioCredit[];
  paginacion: {
    limit: number;
    offset: number;
  };
}

export interface PublicClientPortfolio {
  cliente: {
    idCliente: string;
    nombreCompleto: string;
    documento: string | null;
    telefono: string | null;
    estado: 'ACTIVO' | 'INACTIVO';
  };
  resumen: {
    totalCreditos: number;
    totalMontoInicial: number;
    totalMontoAbonado: number;
    totalSaldoPendiente: number;
    ultimoCreditoEn: string | null;
  };
  creditosActivos: PublicPortfolioCredit[];
  creditosPagados: PublicPortfolioCredit[];
  creditosAnulados: PublicPortfolioCredit[];
  ultimoAbono: {
    idAbono: string;
    idCredito: string;
    valorAbono: number;
    metodoPago: string;
    fechaAbono: string;
    creadoEn: string;
  } | null;
}
