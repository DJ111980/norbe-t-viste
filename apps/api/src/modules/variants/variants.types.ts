export type VariantStatus = 'ACTIVA' | 'INACTIVA';

export interface VariantRecord {
  id_variante: string;
  id_producto: string;
  sku: string;
  codigo_qr: string;
  ruta_qr: string | null;
  talla: string | null;
  color: string | null;
  talla_normalizada: string;
  color_normalizado: string;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  imagen_variante: string | null;
  mostrar_en_catalogo: number;
  estado: VariantStatus;
  creado_en: string;
  actualizado_en: string;
  creado_por: string | null;
  actualizado_por: string | null;
  nombre_producto: string | null;
  estado_producto: 'ACTIVO' | 'INACTIVO' | null;
}

export interface VariantProductSummary {
  idProducto: string;
  nombreProducto: string | null;
  estadoProducto: 'ACTIVO' | 'INACTIVO' | null;
}

export interface PublicVariant {
  idVariante: string;
  producto: VariantProductSummary;
  sku: string;
  codigoQr: string;
  talla: string | null;
  color: string | null;
  tallaNormalizada: string;
  colorNormalizada: string;
  precioCompraReferencia: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  estado: VariantStatus;
  creadoEn: string;
  actualizadoEn: string;
  creadoPor: string | null;
  actualizadoPor: string | null;
}

export interface CreateVariantInput {
  talla: string | null;
  color: string | null;
  tallaNormalizada: string;
  colorNormalizado: string;
  sku?: string;
  precioVenta: number;
  precioCompraReferencia: number;
  stockMinimo: number;
}

export type UpdateVariantInput = Partial<CreateVariantInput>;

export interface UpdateVariantStatusInput {
  estado: VariantStatus;
}

export interface ListVariantsFilters {
  buscar?: string;
  estado?: VariantStatus;
  producto?: string;
  talla?: string;
  color?: string;
  codigoQr?: string;
  sku?: string;
  stockBajo?: boolean;
  limit: number;
  offset: number;
}

export interface ProductForVariant {
  id_producto: string;
  estado: 'ACTIVO' | 'INACTIVO';
}
