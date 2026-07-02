import type {
  ProductImageRecord,
  ProductImageResponse,
  VariantImageRecord,
  VariantImageResponse,
} from './images.types';

export function toProductImageResponse(product: ProductImageRecord): ProductImageResponse {
  return {
    id_producto: product.id_producto,
    imagen: product.imagen_principal
      ? {
          key: product.imagen_principal,
          origen: 'PRODUCTO',
        }
      : null,
  };
}

export function toVariantImageResponse(variant: VariantImageRecord): VariantImageResponse {
  if (variant.imagen_variante) {
    return {
      id_variante: variant.id_variante,
      imagen: {
        key: variant.imagen_variante,
        origen: 'VARIANTE',
      },
      origen: 'VARIANTE',
    };
  }

  if (variant.imagen_principal) {
    return {
      id_variante: variant.id_variante,
      imagen: {
        key: variant.imagen_principal,
        origen: 'PRODUCTO',
      },
      origen: 'PRODUCTO',
    };
  }

  return {
    id_variante: variant.id_variante,
    imagen: null,
    origen: 'NINGUNA',
  };
}
