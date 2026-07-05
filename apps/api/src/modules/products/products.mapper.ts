import type { ProductRecord, PublicProduct } from './products.types';

export function toPublicProduct(product: ProductRecord): PublicProduct {
  // El producto base no expone stock: el stock real pertenece a variantes_producto.
  // Las imagenes/R2 se implementaran en un modulo separado y no se editan aqui.
  return {
    idProducto: product.id_producto,
    nombreProducto: product.nombre_producto,
    descripcion: product.descripcion,
    marca: product.marca,
    visibleCatalogo: product.mostrar_en_catalogo === 1,
    estado: product.estado,
    categoria: {
      idCategoria: product.id_categoria,
      nombreCategoria: product.categoria_nombre,
      estado: product.categoria_estado,
    },
    creadoEn: product.creado_en,
    actualizadoEn: product.actualizado_en,
    creadoPor: product.creado_por,
    actualizadoPor: product.actualizado_por,
  };
}
