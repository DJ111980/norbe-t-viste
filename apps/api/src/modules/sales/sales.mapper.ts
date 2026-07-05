import type {
  CreateCashSaleResult,
  PublicSaleDetail,
  PublicSaleLine,
  PublicSalePayment,
  PublicSaleSummary,
  SaleDetailRecord,
  SaleDetailViewRecord,
  SaleListRecord,
  SalePaymentRecord,
} from './sales.types';

export function toCashSaleSummary(result: CreateCashSaleResult): CreateCashSaleResult {
  return result;
}

export function toPublicSaleSummary(record: SaleListRecord): PublicSaleSummary {
  return {
    idVenta: record.id_venta,
    numeroVenta: record.numero_venta,
    tipoVenta: record.tipo_venta,
    estadoVenta: record.estado_venta,
    total: record.total,
    subtotal: record.subtotal,
    descuento: record.descuento,
    saldoPendiente: record.saldo_pendiente,
    cliente: record.id_cliente
      ? {
          idCliente: record.id_cliente,
          nombreCompleto: record.cliente_nombre,
        }
      : null,
    vendedor: {
      idUsuario: record.id_usuario,
      nombreCompleto: record.vendedor_nombre,
      correo: record.vendedor_correo,
    },
    creadoEn: record.creado_en,
    fechaVenta: record.fecha_venta ?? record.creado_en,
    cantidadItems: record.cantidad_items,
  };
}

export function toPublicSaleLine(record: SaleDetailRecord): PublicSaleLine {
  return {
    idDetalle: record.id_detalle_venta,
    idVariante: record.id_variante,
    nombreProducto: record.nombre_producto,
    codigoQr: record.codigo_qr,
    talla: record.talla,
    color: record.color,
    cantidad: record.cantidad,
    precioUnitario: record.precio_unitario,
    descuento: record.descuento,
    subtotalBruto: record.cantidad * record.precio_unitario,
    subtotal: record.subtotal,
  };
}

export function toPublicSalePayment(record: SalePaymentRecord): PublicSalePayment {
  return {
    idPago: record.id_pago_venta,
    idVenta: record.id_venta,
    metodoPago: record.metodo_pago,
    monto: record.valor_pagado,
    estadoPago: record.estado_pago,
    usuario: record.id_usuario
      ? {
          idUsuario: record.id_usuario,
          nombreCompleto: record.usuario_nombre,
          correo: record.usuario_correo,
        }
      : null,
    creadoEn: record.creado_en,
    anuladoEn: record.anulado_en,
    motivoAnulacion: record.motivo_anulacion,
  };
}

export function toPublicSaleDetail(record: SaleDetailViewRecord): PublicSaleDetail {
  const summary = toPublicSaleSummary(record);
  const detalles = record.detalles.map(toPublicSaleLine);
  const pagos = record.pagos.map(toPublicSalePayment);
  const descuentoLineas = record.detalles.reduce((sum, detail) => sum + detail.descuento, 0);
  const descuentoGeneral = Math.max(record.descuento - descuentoLineas, 0);

  return {
    ...summary,
    subtotal: record.subtotal,
    descuento: record.descuento,
    valorPagadoInicial: record.valor_pagado_inicial,
    observaciones: record.observaciones,
    anuladoEn: record.anulado_en,
    motivoAnulacion: record.motivo_anulacion,
    actualizadoEn: record.actualizado_en,
    detalles,
    pagos,
    resumen: {
      subtotal: record.subtotal,
      descuentoLineas,
      descuentoGeneral,
      descuento: record.descuento,
      total: record.total,
      saldoPendiente: record.saldo_pendiente,
      cantidadItems: record.cantidad_items,
      pagosRegistrados: pagos.length,
    },
  };
}
