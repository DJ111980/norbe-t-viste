import type { PublicSaleReturn, SaleReturnViewRecord } from './returns.types';

export function toPublicSaleReturn(record: SaleReturnViewRecord): PublicSaleReturn {
  return {
    idDevolucion: record.id_devolucion,
    idVenta: record.id_venta,
    tipoVenta: record.tipo_venta,
    motivo: record.motivo,
    estadoDevolucion: record.estado_devolucion,
    totalDevuelto: record.total_devuelto,
    impactoCredito: record.impacto_credito,
    impactoPago: record.impacto_pago,
    creadoPor: {
      idUsuario: record.creado_por,
      nombreCompleto: record.creado_por_nombre,
      correo: record.creado_por_correo,
    },
    creadoEn: record.creado_en,
    anuladoEn: record.anulado_en,
    motivoAnulacion: record.motivo_anulacion,
    detalles: record.detalles,
  };
}
