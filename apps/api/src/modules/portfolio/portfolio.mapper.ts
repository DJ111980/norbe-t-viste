import type {
  PortfolioClientRecord,
  PortfolioCreditRecord,
  PortfolioPaymentRecord,
  PortfolioSummaryRecord,
  PublicClientPortfolio,
  PublicPortfolioCredit,
  PublicPortfolioSummary,
} from './portfolio.types';

export function toPublicPortfolioCredit(record: PortfolioCreditRecord): PublicPortfolioCredit {
  return {
    idCredito: record.id_credito,
    idVenta: record.id_venta,
    origenCredito: record.origen_credito,
    descripcionCredito: record.descripcion_credito,
    montoInicial: record.monto_inicial,
    montoAbonado: record.monto_abonado,
    saldoPendiente: record.saldo_pendiente,
    fechaCredito: record.fecha_credito,
    estadoCredito: record.estado_credito,
    cliente: {
      idCliente: record.id_cliente,
      nombreCompleto: record.cliente_nombre,
      documento: record.cliente_documento,
      telefono: record.cliente_telefono,
    },
  };
}

export function toPublicPortfolioSummary(record: PortfolioSummaryRecord): PublicPortfolioSummary {
  return {
    totalCreditos: record.total_creditos,
    creditosPendientes: record.creditos_pendientes,
    creditosParciales: record.creditos_parciales,
    creditosPagados: record.creditos_pagados,
    creditosAnulados: record.creditos_anulados,
    totalMontoInicial: record.total_monto_inicial,
    totalMontoAbonado: record.total_monto_abonado,
    totalSaldoPendiente: record.total_saldo_pendiente,
    clientesConDeuda: record.clientes_con_deuda,
  };
}

export function toPublicClientPortfolio(
  client: PortfolioClientRecord,
  credits: PortfolioCreditRecord[],
  lastPayment: PortfolioPaymentRecord | null,
): PublicClientPortfolio {
  const publicCredits = credits.map(toPublicPortfolioCredit);
  const activeCredits = publicCredits.filter((credit) =>
    ['PENDIENTE', 'PARCIAL', 'VENCIDO'].includes(credit.estadoCredito),
  );

  // La deuda del cliente no vive en clientes: se calcula desde creditos_clientes
  // para que abonos, ajustes y anulaciones expliquen el saldo actual.
  const activeDebtCredits = credits.filter((credit) => credit.estado_credito !== 'ANULADO');

  return {
    cliente: {
      idCliente: client.id_cliente,
      nombreCompleto: client.nombre_completo,
      documento: client.documento,
      telefono: client.telefono,
      estado: client.estado,
    },
    resumen: {
      totalCreditos: credits.length,
      totalMontoInicial: credits.reduce((sum, credit) => sum + credit.monto_inicial, 0),
      totalMontoAbonado: credits.reduce((sum, credit) => sum + credit.monto_abonado, 0),
      totalSaldoPendiente: activeDebtCredits.reduce(
        (sum, credit) => sum + credit.saldo_pendiente,
        0,
      ),
      ultimoCreditoEn: credits[0]?.fecha_credito ?? null,
    },
    creditosActivos: activeCredits,
    creditosPagados: publicCredits.filter((credit) => credit.estadoCredito === 'PAGADO'),
    creditosAnulados: publicCredits.filter((credit) => credit.estadoCredito === 'ANULADO'),
    ultimoAbono: lastPayment
      ? {
          idAbono: lastPayment.id_abono,
          idCredito: lastPayment.id_credito,
          valorAbono: lastPayment.valor_abono,
          metodoPago: lastPayment.metodo_pago,
          fechaAbono: lastPayment.fecha_abono,
          creadoEn: lastPayment.creado_en,
        }
      : null,
  };
}
