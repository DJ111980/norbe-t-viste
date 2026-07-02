export type ClientStatus = 'ACTIVO' | 'INACTIVO';

export interface ClientRecord {
  id_cliente: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  direccion: string | null;
  ciudad: string | null;
  correo: string | null;
  observaciones: string | null;
  estado: ClientStatus;
  creado_en: string;
  actualizado_en: string;
  creado_por: string | null;
  actualizado_por: string | null;
  fecha_ultima_compra: string | null;
}

export interface PublicClient {
  idCliente: string;
  nombreCompleto: string;
  documento: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  direccion: string | null;
  ciudad: string | null;
  correo: string | null;
  observaciones: string | null;
  estado: ClientStatus;
  creadoEn: string;
  actualizadoEn: string;
  creadoPor: string | null;
  actualizadoPor: string | null;
  fechaUltimaCompra: string | null;
}

export interface CreateClientInput {
  nombreCompleto: string;
  documento: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  direccion: string | null;
  ciudad: string | null;
  correo: string | null;
  observaciones: string | null;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface UpdateClientStatusInput {
  estado: ClientStatus;
}

export interface ListClientsFilters {
  buscar?: string;
  estado?: ClientStatus;
  telefono?: string;
  documento?: string;
  limit: number;
  offset: number;
}
