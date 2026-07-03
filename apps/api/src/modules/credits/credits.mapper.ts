import type {
  CreateOldDebtResult,
  CreditDetailViewRecord,
  CreditRecord,
  PublicCreditDetail,
  PublicCreditSummary,
} from './credits.types';

export function toPublicCreditSummary(record: CreditRecord): PublicCreditSummary {
  return {
    idCredito: record.id_credito,
    origenCredito: record.origen_credito,
    tipoDeudaAntigua: record.tipo_deuda_antigua,
    descripcionCredito: record.descripcion_credito,
    montoInicial: record.monto_inicial,
    montoAbonado: record.monto_abonado,
    saldoPendiente: record.saldo_pendiente,
    fechaCredito: record.fecha_credito,
    fechaVencimiento: record.fecha_vencimiento,
    estadoCredito: record.estado_credito,
    anuladoEn: record.anulado_en,
    motivoAnulacion: record.motivo_anulacion,
    cliente: {
      idCliente: record.id_cliente,
      nombreCompleto: record.cliente_nombre,
      documento: record.cliente_documento,
      telefono: record.cliente_telefono,
    },
  };
}

export function toPublicCreditDetail(record: CreditDetailViewRecord): PublicCreditDetail {
  return {
    ...toPublicCreditSummary(record),
    idVenta: record.id_venta,
    venta: record.venta,
    observaciones: record.observaciones,
    creadoEn: record.creado_en,
    actualizadoEn: record.actualizado_en,
    detalles: record.detalles,
    abonos: record.abonos,
    ajustes: record.ajustes,
    resumen: {
      montoInicial: record.monto_inicial,
      montoAbonado: record.monto_abonado,
      saldoPendiente: record.saldo_pendiente,
      estadoCredito: record.estado_credito,
    },
  };
}

export function toOldDebtResult(record: CreditRecord): CreateOldDebtResult {
  return {
    id_credito: record.id_credito,
    id_cliente: record.id_cliente,
    origen_credito: 'DEUDA_ANTIGUA',
    tipo_deuda_antigua: record.tipo_deuda_antigua ?? 'SOLO_MONTO',
    monto_inicial: record.monto_inicial,
    monto_abonado: 0,
    saldo_pendiente: record.saldo_pendiente,
    estado_credito: 'PENDIENTE',
  };
}
