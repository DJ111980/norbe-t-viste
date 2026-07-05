import type { UserRole } from '../auth/auth.types';

export type ProductStatus = 'ACTIVO' | 'INACTIVO';

export interface ProductRecord {
  id_producto: string;
  id_categoria: string;
  nombre_producto: string;
  descripcion: string | null;
  marca: string | null;
  imagen_principal: string | null;
  mostrar_en_catalogo: number;
  estado: ProductStatus;
  creado_en: string;
  actualizado_en: string;
  creado_por: string | null;
  actualizado_por: string | null;
  nombre_normalizado: string | null;
  categoria_nombre: string | null;
  categoria_estado: 'ACTIVA' | 'INACTIVA' | null;
}

export interface ProductCategorySummary {
  idCategoria: string;
  nombreCategoria: string | null;
  estado: 'ACTIVA' | 'INACTIVA' | null;
}

export interface PublicProduct {
  idProducto: string;
  nombreProducto: string;
  descripcion: string | null;
  marca: string | null;
  visibleCatalogo: boolean;
  estado: ProductStatus;
  categoria: ProductCategorySummary;
  creadoEn: string;
  actualizadoEn: string;
  creadoPor: string | null;
  actualizadoPor: string | null;
}

export interface CreateProductInput {
  nombreProducto: string;
  nombreNormalizado: string;
  idCategoria: string;
  descripcion: string | null;
  marca: string | null;
  visibleCatalogo: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface UpdateProductStatusInput {
  estado: ProductStatus;
}

export interface ListProductsFilters {
  buscar?: string;
  estado?: ProductStatus;
  categoria?: string;
  visibleCatalogo?: boolean;
  limit: number;
  offset: number;
}

export interface CategoryForProduct {
  id_categoria: string;
  estado: 'ACTIVA' | 'INACTIVA';
}

export interface ProductAccess {
  rol: UserRole;
}
