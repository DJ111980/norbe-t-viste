import { ApiError } from '../../shared/errors';
import {
  SHIPPING_MODES,
  type CreateProviderInput,
  type ListProvidersFilters,
  type ProviderStatus,
  type ShippingMode,
  type UpdateProviderInput,
  type UpdateProviderStatusInput,
} from './providers.types';

const VALID_STATUSES: ProviderStatus[] = ['ACTIVO', 'INACTIVO'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type ProviderField =
  | 'nombre_proveedor'
  | 'tipo_documento'
  | 'numero_documento'
  | 'nombre_contacto'
  | 'telefono_principal'
  | 'telefono_secundario'
  | 'correo'
  | 'ciudad'
  | 'direccion'
  | 'pais'
  | 'modo_envio'
  | 'empresa_transportadora'
  | 'tiempo_entrega_estimado'
  | 'forma_pago'
  | 'cuenta_pago'
  | 'notas';

const PROVIDER_FIELDS: ProviderField[] = [
  'nombre_proveedor',
  'tipo_documento',
  'numero_documento',
  'nombre_contacto',
  'telefono_principal',
  'telefono_secundario',
  'correo',
  'ciudad',
  'direccion',
  'pais',
  'modo_envio',
  'empresa_transportadora',
  'tiempo_entrega_estimado',
  'forma_pago',
  'cuenta_pago',
  'notas',
];

interface RawProviderBody {
  nombre_proveedor?: unknown;
  tipo_documento?: unknown;
  numero_documento?: unknown;
  nombre_contacto?: unknown;
  telefono_principal?: unknown;
  telefono_secundario?: unknown;
  correo?: unknown;
  ciudad?: unknown;
  direccion?: unknown;
  pais?: unknown;
  modo_envio?: unknown;
  empresa_transportadora?: unknown;
  tiempo_entrega_estimado?: unknown;
  forma_pago?: unknown;
  cuenta_pago?: unknown;
  notas?: unknown;
}

interface RawUpdateStatusBody {
  estado?: unknown;
}

export function normalizeProviderName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeRequiredName(value: unknown, emptyMessage: string): string {
  const nombreProveedor = typeof value === 'string' ? value.trim() : '';

  if (!nombreProveedor) {
    throw new ApiError('INVALID_PROVIDER_NAME', emptyMessage, 400);
  }

  if (nombreProveedor.length < 2) {
    throw new ApiError(
      'INVALID_PROVIDER_NAME',
      'El nombre del proveedor debe tener al menos 2 caracteres.',
      400,
    );
  }

  return nombreProveedor;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError('INVALID_PROVIDER_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function validateEmail(correo: string | null): void {
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new ApiError(
      'INVALID_PROVIDER_EMAIL',
      'El correo del proveedor no tiene formato valido.',
      400,
    );
  }
}

function normalizeShippingMode(value: unknown): ShippingMode | null {
  const modoEnvio = normalizeOptionalText(value);

  if (modoEnvio === null) {
    return null;
  }

  if (!SHIPPING_MODES.includes(modoEnvio as ShippingMode)) {
    throw new ApiError('INVALID_SHIPPING_MODE', 'El modo de envio no es valido.', 400);
  }

  return modoEnvio as ShippingMode;
}

function parseNumberParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('INVALID_PAGINATION', 'La paginacion enviada no es valida.', 400);
  }

  return max ? Math.min(parsed, max) : parsed;
}

export function validateCreateProviderInput(body: unknown): CreateProviderInput {
  const rawBody = body as RawProviderBody;
  const nombreProveedor = normalizeRequiredName(
    rawBody?.nombre_proveedor,
    'El nombre del proveedor es obligatorio.',
  );
  const correo = normalizeOptionalText(rawBody?.correo)?.toLowerCase() ?? null;

  validateEmail(correo);

  return {
    nombreProveedor,
    nombreNormalizado: normalizeProviderName(nombreProveedor),
    tipoDocumento: normalizeOptionalText(rawBody?.tipo_documento),
    numeroDocumento: normalizeOptionalText(rawBody?.numero_documento),
    nombreContacto: normalizeOptionalText(rawBody?.nombre_contacto),
    telefonoPrincipal: normalizeOptionalText(rawBody?.telefono_principal),
    telefonoSecundario: normalizeOptionalText(rawBody?.telefono_secundario),
    correo,
    ciudad: normalizeOptionalText(rawBody?.ciudad),
    direccion: normalizeOptionalText(rawBody?.direccion),
    pais: normalizeOptionalText(rawBody?.pais),
    modoEnvio: normalizeShippingMode(rawBody?.modo_envio),
    empresaTransportadora: normalizeOptionalText(rawBody?.empresa_transportadora),
    tiempoEntregaEstimado: normalizeOptionalText(rawBody?.tiempo_entrega_estimado),
    formaPago: normalizeOptionalText(rawBody?.forma_pago),
    cuentaPago: normalizeOptionalText(rawBody?.cuenta_pago),
    notas: normalizeOptionalText(rawBody?.notas),
  };
}

export function validateUpdateProviderInput(body: unknown): UpdateProviderInput {
  const rawBody = body as RawProviderBody;
  const input: UpdateProviderInput = {};

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (
    Object.keys(rawBody).filter((field) => PROVIDER_FIELDS.includes(field as ProviderField))
      .length === 0
  ) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.nombre_proveedor !== undefined) {
    input.nombreProveedor = normalizeRequiredName(
      rawBody.nombre_proveedor,
      'El nombre del proveedor no puede estar vacio.',
    );
    input.nombreNormalizado = normalizeProviderName(input.nombreProveedor);
  }

  if (rawBody.tipo_documento !== undefined) {
    input.tipoDocumento = normalizeOptionalText(rawBody.tipo_documento);
  }
  if (rawBody.numero_documento !== undefined) {
    input.numeroDocumento = normalizeOptionalText(rawBody.numero_documento);
  }
  if (rawBody.nombre_contacto !== undefined) {
    input.nombreContacto = normalizeOptionalText(rawBody.nombre_contacto);
  }
  if (rawBody.telefono_principal !== undefined) {
    input.telefonoPrincipal = normalizeOptionalText(rawBody.telefono_principal);
  }
  if (rawBody.telefono_secundario !== undefined) {
    input.telefonoSecundario = normalizeOptionalText(rawBody.telefono_secundario);
  }
  if (rawBody.correo !== undefined) {
    input.correo = normalizeOptionalText(rawBody.correo)?.toLowerCase() ?? null;
    validateEmail(input.correo);
  }
  if (rawBody.ciudad !== undefined) input.ciudad = normalizeOptionalText(rawBody.ciudad);
  if (rawBody.direccion !== undefined) input.direccion = normalizeOptionalText(rawBody.direccion);
  if (rawBody.pais !== undefined) input.pais = normalizeOptionalText(rawBody.pais);
  if (rawBody.modo_envio !== undefined) input.modoEnvio = normalizeShippingMode(rawBody.modo_envio);
  if (rawBody.empresa_transportadora !== undefined) {
    input.empresaTransportadora = normalizeOptionalText(rawBody.empresa_transportadora);
  }
  if (rawBody.tiempo_entrega_estimado !== undefined) {
    input.tiempoEntregaEstimado = normalizeOptionalText(rawBody.tiempo_entrega_estimado);
  }
  if (rawBody.forma_pago !== undefined) input.formaPago = normalizeOptionalText(rawBody.forma_pago);
  if (rawBody.cuenta_pago !== undefined)
    input.cuentaPago = normalizeOptionalText(rawBody.cuenta_pago);
  if (rawBody.notas !== undefined) input.notas = normalizeOptionalText(rawBody.notas);

  return input;
}

export function validateUpdateProviderStatusInput(body: unknown): UpdateProviderStatusInput {
  const rawBody = body as RawUpdateStatusBody;

  if (
    typeof rawBody?.estado !== 'string' ||
    !VALID_STATUSES.includes(rawBody.estado as ProviderStatus)
  ) {
    throw new ApiError('INVALID_PROVIDER_STATUS', 'El estado del proveedor no es valido.', 400);
  }

  return {
    estado: rawBody.estado as ProviderStatus,
  };
}

export function validateListProvidersFilters(searchParams: URLSearchParams): ListProvidersFilters {
  const estado = searchParams.get('estado');
  const modoEnvio = normalizeOptionalText(searchParams.get('modo_envio'));

  if (estado && !VALID_STATUSES.includes(estado as ProviderStatus)) {
    throw new ApiError('INVALID_PROVIDER_STATUS', 'El estado del proveedor no es valido.', 400);
  }

  if (modoEnvio && !SHIPPING_MODES.includes(modoEnvio as ShippingMode)) {
    throw new ApiError('INVALID_SHIPPING_MODE', 'El modo de envio no es valido.', 400);
  }

  return {
    buscar: normalizeOptionalText(searchParams.get('buscar')) ?? undefined,
    estado: estado ? (estado as ProviderStatus) : undefined,
    ciudad: normalizeOptionalText(searchParams.get('ciudad')) ?? undefined,
    telefono: normalizeOptionalText(searchParams.get('telefono')) ?? undefined,
    modoEnvio: modoEnvio ? (modoEnvio as ShippingMode) : undefined,
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
