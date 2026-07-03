export type UserRole = 'ADMINISTRADOR' | 'VENDEDOR';

export interface AuthUser {
  idUsuario: string;
  nombreCompleto: string;
  correo: string;
  rol: UserRole;
}

export interface DashboardSummary {
  periodo: {
    fechaDesde: string;
    fechaHasta: string;
  };
  ventas: {
    cantidad_total: number;
    total_vendido: number;
    total_contado: number;
    total_credito: number;
    total_mixto: number;
    ventas_anuladas: number;
  };
  pagos: {
    total_recibido: number;
  };
  cartera: {
    saldo_pendiente_total: number;
    creditos_pendientes: number;
    creditos_pagados: number;
    creditos_anulados: number;
  };
  inventario: {
    variantes_total: number;
    variantes_activas: number;
    stock_total: number;
    variantes_sin_stock: number;
    variantes_bajo_stock: number;
  };
  devoluciones: {
    cantidad_total: number;
    total_devuelto: number;
  };
  lotes: {
    lotes_borrador: number;
    lotes_confirmados: number;
    lotes_anulados: number;
  };
  alertas: {
    variantes_sin_qr: number;
    variantes_sin_imagen: number;
    productos_sin_imagen: number;
    creditos_con_saldo: number;
  };
}

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
}

export type CommonStatus = 'ACTIVO' | 'INACTIVO';
export type CategoryStatus = 'ACTIVA' | 'INACTIVA';

export interface Client {
  idCliente: string;
  nombreCompleto: string;
  documento: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  direccion: string | null;
  ciudad: string | null;
  correo: string | null;
  observaciones: string | null;
  estado: CommonStatus;
  actualizadoEn: string;
}

export interface ClientFormValues {
  nombre_completo: string;
  documento: string;
  telefono: string;
  telefono_secundario: string;
  direccion: string;
  ciudad: string;
  correo: string;
  observaciones: string;
}

export type ShippingMode =
  'ENVIO_TRANSPORTADORA' | 'RECOGIDA_EN_LOCAL' | 'DOMICILIO' | 'ENCOMIENDA' | 'OTRO';

export interface Provider {
  idProveedor: string;
  nombreProveedor: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  nombreContacto: string | null;
  telefonoPrincipal: string | null;
  telefonoSecundario: string | null;
  correo: string | null;
  ciudad: string | null;
  direccion: string | null;
  pais: string | null;
  modoEnvio: ShippingMode | null;
  empresaTransportadora: string | null;
  tiempoEntregaEstimado: string | null;
  formaPago: string | null;
  cuentaPago: string | null;
  notas: string | null;
  estado: CommonStatus;
  actualizadoEn: string;
}

export interface ProviderFormValues {
  nombre_proveedor: string;
  tipo_documento: string;
  numero_documento: string;
  nombre_contacto: string;
  telefono_principal: string;
  telefono_secundario: string;
  correo: string;
  ciudad: string;
  direccion: string;
  pais: string;
  modo_envio: string;
  empresa_transportadora: string;
  tiempo_entrega_estimado: string;
  forma_pago: string;
  cuenta_pago: string;
  notas: string;
}

export interface Category {
  idCategoria: string;
  nombreCategoria: string;
  descripcion: string | null;
  estado: CategoryStatus;
  actualizadoEn: string;
}

export interface CategoryFormValues {
  nombre_categoria: string;
  descripcion: string;
}

export type ProductStatus = 'ACTIVO' | 'INACTIVO';
export type VariantStatus = 'ACTIVA' | 'INACTIVA';

export interface Product {
  idProducto: string;
  nombreProducto: string;
  descripcion: string | null;
  marca: string | null;
  referencia: string | null;
  visibleCatalogo: boolean;
  estado: ProductStatus;
  categoria: {
    idCategoria: string;
    nombreCategoria: string | null;
    estado: CategoryStatus | null;
  };
  actualizadoEn: string;
}

export interface ProductFormValues {
  nombre_producto: string;
  id_categoria: string;
  descripcion: string;
  marca: string;
  referencia: string;
  visible_catalogo: boolean;
}

export interface Variant {
  idVariante: string;
  producto: {
    idProducto: string;
    nombreProducto: string | null;
    estadoProducto: ProductStatus | null;
  };
  sku: string;
  codigoQr: string;
  talla: string | null;
  color: string | null;
  precioCompraReferencia: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  estado: VariantStatus;
  actualizadoEn: string;
}

export interface VariantFormValues {
  id_producto: string;
  talla: string;
  color: string;
  sku: string;
  precio_venta: number;
  precio_compra_referencia: number;
  stock_minimo: number;
}

export interface ImageMetadata {
  key: string;
  origen: 'PRODUCTO' | 'VARIANTE';
}
