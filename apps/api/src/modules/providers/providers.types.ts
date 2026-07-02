export type ProviderStatus = 'ACTIVO' | 'INACTIVO';

export type ShippingMode =
  'ENVIO_TRANSPORTADORA' | 'RECOGIDA_EN_LOCAL' | 'DOMICILIO' | 'ENCOMIENDA' | 'OTRO';

export const SHIPPING_MODES: ShippingMode[] = [
  'ENVIO_TRANSPORTADORA',
  'RECOGIDA_EN_LOCAL',
  'DOMICILIO',
  'ENCOMIENDA',
  'OTRO',
];

export interface ProviderRecord {
  id_proveedor: string;
  nombre_proveedor: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  nombre_contacto: string | null;
  telefono_principal: string | null;
  telefono_secundario: string | null;
  correo: string | null;
  ciudad: string | null;
  direccion: string | null;
  pais: string | null;
  modo_envio: ShippingMode | null;
  empresa_transportadora: string | null;
  tiempo_entrega_estimado: string | null;
  forma_pago: string | null;
  cuenta_pago: string | null;
  notas: string | null;
  estado: ProviderStatus;
  creado_en: string;
  actualizado_en: string;
  creado_por: string | null;
  actualizado_por: string | null;
  fecha_ultimo_lote: string | null;
  nombre_normalizado: string | null;
}

export interface PublicProvider {
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
  estado: ProviderStatus;
  creadoEn: string;
  actualizadoEn: string;
  creadoPor: string | null;
  actualizadoPor: string | null;
  fechaUltimoLote: string | null;
}

export interface CreateProviderInput {
  nombreProveedor: string;
  nombreNormalizado: string;
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
}

export type UpdateProviderInput = Partial<CreateProviderInput>;

export interface UpdateProviderStatusInput {
  estado: ProviderStatus;
}

export interface ListProvidersFilters {
  buscar?: string;
  estado?: ProviderStatus;
  ciudad?: string;
  telefono?: string;
  modoEnvio?: ShippingMode;
  limit: number;
  offset: number;
}
