import type {
  InventoryMapperOptions,
  InventoryMovementRecord,
  InventoryVariantRecord,
  PublicInventoryMovement,
  PublicInventoryVariant,
} from './inventory.types';

export function toPublicInventoryVariant(
  variant: InventoryVariantRecord,
  options: InventoryMapperOptions,
): PublicInventoryVariant {
  const publicVariant: PublicInventoryVariant = {
    idVariante: variant.id_variante,
    producto: {
      idProducto: variant.id_producto,
      nombreProducto: variant.nombre_producto,
      estadoProducto: variant.estado_producto,
      categoria: variant.id_categoria
        ? {
            idCategoria: variant.id_categoria,
            nombreCategoria: variant.nombre_categoria,
          }
        : null,
    },
    sku: variant.sku,
    codigoQr: variant.codigo_qr,
    talla: variant.talla,
    color: variant.color,
    precioVenta: variant.precio_venta,
    stockActual: variant.stock_actual,
    stockMinimo: variant.stock_minimo,
    // El stock bajo se deriva siempre de la variante: producto base no maneja stock.
    stockBajo: variant.stock_actual <= variant.stock_minimo,
    sinStock: variant.stock_actual <= 0,
    estado: variant.estado,
  };

  if (options.role === 'ADMINISTRADOR') {
    publicVariant.precioCompraReferencia = variant.precio_compra;
  }

  return publicVariant;
}

export function toPublicInventoryMovement(
  movement: InventoryMovementRecord,
): PublicInventoryMovement {
  return {
    idMovimiento: movement.id_movimiento,
    tipoMovimiento: movement.tipo_movimiento,
    cantidad: movement.cantidad,
    stockAntes: movement.stock_antes,
    stockDespues: movement.stock_despues,
    referenciaTipo: movement.referencia_tipo,
    referenciaId: movement.referencia_id,
    motivo: movement.motivo,
    creadoPor: movement.creado_por,
    creadoEn: movement.creado_en,
    variante: {
      idVariante: movement.id_variante,
      sku: movement.sku,
      codigoQr: movement.codigo_qr,
      talla: movement.talla,
      color: movement.color,
    },
    producto: {
      idProducto: movement.id_producto,
      nombreProducto: movement.nombre_producto,
    },
  };
}
