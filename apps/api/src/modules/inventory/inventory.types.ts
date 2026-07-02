import type { UserRole } from '../auth/auth.types';

export type InventoryMovementType =
  | 'LOTE_ENTRADA'
  | 'INVENTARIO_INICIAL'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'VENTA'
  | 'ANULACION_VENTA'
  | 'DEVOLUCION';

export type InventoryReferenceType =
  | 'LOTE_ENTRADA'
  | 'INVENTARIO_INICIAL'
  | 'AJUSTE_INVENTARIO'
  | 'VENTA'
  | 'ANULACION_VENTA'
  | 'DEVOLUCION';

export interface InventoryVariantRecord {
  id_variante: string;
  id_producto: string;
  sku: string;
  codigo_qr: string;
  talla: string | null;
  color: string | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  estado: 'ACTIVA' | 'INACTIVA';
  nombre_producto: string;
  estado_producto: 'ACTIVO' | 'INACTIVO';
  id_categoria: string | null;
  nombre_categoria: string | null;
}

export interface InventoryMovementRecord {
  id_movimiento: string;
  id_variante: string;
  tipo_movimiento: InventoryMovementType;
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  motivo: string | null;
  referencia_tipo: InventoryReferenceType | null;
  referencia_id: string | null;
  creado_por: string;
  creado_en: string;
  sku: string;
  codigo_qr: string;
  talla: string | null;
  color: string | null;
  id_producto: string;
  nombre_producto: string;
}

export interface ListInventoryVariantsFilters {
  buscar?: string;
  estado?: 'ACTIVA' | 'INACTIVA';
  producto?: string;
  categoria?: string;
  talla?: string;
  color?: string;
  sku?: string;
  codigoQr?: string;
  stockBajo?: boolean;
  sinStock?: boolean;
  limit: number;
  offset: number;
}

export interface ListInventoryMovementsFilters {
  variante?: string;
  producto?: string;
  tipoMovimiento?: InventoryMovementType;
  referenciaTipo?: InventoryReferenceType;
  referenciaId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit: number;
  offset: number;
}

export interface InitialInventoryItemInput {
  idVariante: string;
  cantidadInicial: number;
  motivo: string;
}

export interface RegisterInitialInventoryInput {
  items: InitialInventoryItemInput[];
}

export interface InitialInventoryMovementInput {
  idMovimiento: string;
  idVariante: string;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  motivo: string;
}

export interface RegisterInitialInventoryResult {
  items_procesados: number;
  movimientos_creados: number;
  total_unidades_ingresadas: number;
}

export type ManualInventoryAdjustmentType = 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';

export interface ManualInventoryAdjustmentInput {
  idVariante: string;
  tipoAjuste: ManualInventoryAdjustmentType;
  cantidad: number;
  motivo: string;
}

export interface ManualInventoryAdjustmentMovementInput {
  idMovimiento: string;
  idVariante: string;
  tipoAjuste: ManualInventoryAdjustmentType;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  motivo: string;
}

export interface ManualInventoryAdjustmentResult {
  id_variante: string;
  tipo_ajuste: ManualInventoryAdjustmentType;
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  movimiento_creado: boolean;
}

export interface InventoryMapperOptions {
  role: UserRole;
}

export interface PublicInventoryVariant {
  idVariante: string;
  producto: {
    idProducto: string;
    nombreProducto: string;
    estadoProducto: 'ACTIVO' | 'INACTIVO';
    categoria: {
      idCategoria: string;
      nombreCategoria: string | null;
    } | null;
  };
  sku: string;
  codigoQr: string;
  talla: string | null;
  color: string | null;
  precioCompraReferencia?: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  stockBajo: boolean;
  sinStock: boolean;
  estado: 'ACTIVA' | 'INACTIVA';
}

export interface PublicInventoryMovement {
  idMovimiento: string;
  tipoMovimiento: InventoryMovementType;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  referenciaTipo: InventoryReferenceType | null;
  referenciaId: string | null;
  motivo: string | null;
  creadoPor: string;
  creadoEn: string;
  variante: {
    idVariante: string;
    sku: string;
    codigoQr: string;
    talla: string | null;
    color: string | null;
  };
  producto: {
    idProducto: string;
    nombreProducto: string;
  };
}
