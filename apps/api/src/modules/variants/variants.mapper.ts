import type { PublicVariant, VariantRecord } from './variants.types';

export function toPublicVariant(variant: VariantRecord): PublicVariant {
  // El stock se expone porque pertenece a la variante. El producto base no recibe
  // ni devuelve stock agregado en este mapper.
  return {
    idVariante: variant.id_variante,
    producto: {
      idProducto: variant.id_producto,
      nombreProducto: variant.nombre_producto,
      estadoProducto: variant.estado_producto,
    },
    sku: variant.sku,
    codigoQr: variant.codigo_qr,
    talla: variant.talla,
    color: variant.color,
    tallaNormalizada: variant.talla_normalizada,
    colorNormalizada: variant.color_normalizado,
    precioCompraReferencia: variant.precio_compra,
    precioVenta: variant.precio_venta,
    stockActual: variant.stock_actual,
    stockMinimo: variant.stock_minimo,
    estado: variant.estado,
    creadoEn: variant.creado_en,
    actualizadoEn: variant.actualizado_en,
    creadoPor: variant.creado_por,
    actualizadoPor: variant.actualizado_por,
  };
}
