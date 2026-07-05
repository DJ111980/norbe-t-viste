import type {
  EntryLotDetailRecord,
  EntryLotMapperOptions,
  EntryLotRecord,
  PublicEntryLot,
  PublicEntryLotDetail,
  PublicEntryLotSummary,
} from './entry-lots.types';

function canSeeCosts(options: EntryLotMapperOptions): boolean {
  // Los costos de compra son informacion sensible del negocio; el vendedor puede
  // consultar disponibilidad y trazabilidad basica, pero no margenes ni compras.
  return options.role === 'ADMINISTRADOR';
}

export function toPublicEntryLotSummary(
  lot: EntryLotRecord,
  options: EntryLotMapperOptions,
): PublicEntryLotSummary {
  return {
    idLote: lot.id_lote,
    idProveedor: lot.id_proveedor,
    nombreProveedor: lot.nombre_proveedor,
    numeroLote: lot.numero_lote,
    numeroFactura: lot.numero_factura_proveedor,
    fechaLote: lot.fecha_lote,
    estadoLote: lot.estado_lote,
    observaciones: lot.observaciones,
    cantidadDetalles: lot.cantidad_detalles ?? 0,
    totalEstimado: canSeeCosts(options) ? (lot.total_estimado ?? 0) : null,
    creadoPor: lot.creado_por,
    actualizadoPor: lot.actualizado_por,
    creadoEn: lot.creado_en,
    actualizadoEn: lot.actualizado_en,
  };
}

export function toPublicEntryLotDetail(
  detail: EntryLotDetailRecord,
  options: EntryLotMapperOptions,
): PublicEntryLotDetail {
  const publicDetail: PublicEntryLotDetail = {
    idDetalleLote: detail.id_detalle_lote,
    variante: {
      idVariante: detail.id_variante,
      codigoQr: detail.codigo_qr,
      talla: detail.talla,
      color: detail.color,
      stockActual: detail.stock_actual,
      estado: detail.estado_variante,
    },
    producto: {
      idProducto: detail.id_producto,
      nombreProducto: detail.nombre_producto,
      estado: detail.estado_producto,
    },
    cantidad: detail.cantidad,
    precioVentaSugerido: detail.precio_venta_sugerido,
    cantidadEtiquetasQr: detail.cantidad_etiquetas_qr,
    observaciones: detail.observaciones,
    creadoEn: detail.creado_en,
    actualizadoEn: detail.actualizado_en,
  };

  if (canSeeCosts(options)) {
    publicDetail.costoUnitario = detail.costo_unitario;
    publicDetail.subtotal = detail.subtotal;
  }

  return publicDetail;
}

export function toPublicEntryLot(
  lot: EntryLotRecord,
  details: EntryLotDetailRecord[],
  options: EntryLotMapperOptions,
): PublicEntryLot {
  return {
    ...toPublicEntryLotSummary(lot, options),
    proveedor: lot.id_proveedor
      ? {
          idProveedor: lot.id_proveedor,
          nombreProveedor: lot.nombre_proveedor ?? '',
          estado: lot.estado_proveedor ?? 'ACTIVO',
        }
      : null,
    confirmadoPor: lot.confirmado_por,
    confirmadoEn: lot.confirmado_en,
    anuladoPor: lot.anulado_por,
    anuladoEn: lot.anulado_en,
    motivoAnulacion: lot.motivo_anulacion,
    detalles: details.map((detail) => toPublicEntryLotDetail(detail, options)),
  };
}
