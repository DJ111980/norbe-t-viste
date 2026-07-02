import { ApiError } from '../../shared/errors';
import type {
  ClientStatus,
  CreateClientInput,
  ListClientsFilters,
  UpdateClientInput,
  UpdateClientStatusInput,
} from './clients.types';

const VALID_STATUSES: ClientStatus[] = ['ACTIVO', 'INACTIVO'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type ClientField =
  | 'nombre_completo'
  | 'documento'
  | 'telefono'
  | 'telefono_secundario'
  | 'direccion'
  | 'ciudad'
  | 'correo'
  | 'observaciones';

const CLIENT_FIELDS: ClientField[] = [
  'nombre_completo',
  'documento',
  'telefono',
  'telefono_secundario',
  'direccion',
  'ciudad',
  'correo',
  'observaciones',
];

interface RawClientBody {
  nombre_completo?: unknown;
  documento?: unknown;
  telefono?: unknown;
  telefono_secundario?: unknown;
  direccion?: unknown;
  ciudad?: unknown;
  correo?: unknown;
  observaciones?: unknown;
}

interface RawUpdateStatusBody {
  estado?: unknown;
}

function normalizeRequiredName(value: unknown, emptyMessage: string): string {
  const nombreCompleto = typeof value === 'string' ? value.trim() : '';

  if (!nombreCompleto) {
    throw new ApiError('INVALID_CLIENT_NAME', emptyMessage, 400);
  }

  if (nombreCompleto.length < 2) {
    throw new ApiError(
      'INVALID_CLIENT_NAME',
      'El nombre completo debe tener al menos 2 caracteres.',
      400,
    );
  }

  return nombreCompleto;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError('INVALID_CLIENT_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function validateEmail(correo: string | null): void {
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new ApiError(
      'INVALID_CLIENT_EMAIL',
      'El correo del cliente no tiene formato valido.',
      400,
    );
  }
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

export function validateCreateClientInput(body: unknown): CreateClientInput {
  const rawBody = body as RawClientBody;
  const correo = normalizeOptionalText(rawBody?.correo)?.toLowerCase() ?? null;

  validateEmail(correo);

  return {
    nombreCompleto: normalizeRequiredName(
      rawBody?.nombre_completo,
      'El nombre completo del cliente es obligatorio.',
    ),
    documento: normalizeOptionalText(rawBody?.documento),
    telefono: normalizeOptionalText(rawBody?.telefono),
    telefonoSecundario: normalizeOptionalText(rawBody?.telefono_secundario),
    direccion: normalizeOptionalText(rawBody?.direccion),
    ciudad: normalizeOptionalText(rawBody?.ciudad),
    correo,
    observaciones: normalizeOptionalText(rawBody?.observaciones),
  };
}

export function validateUpdateClientInput(body: unknown): UpdateClientInput {
  const rawBody = body as RawClientBody;
  const input: UpdateClientInput = {};

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (
    Object.keys(rawBody).filter((field) => CLIENT_FIELDS.includes(field as ClientField)).length ===
    0
  ) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.nombre_completo !== undefined) {
    input.nombreCompleto = normalizeRequiredName(
      rawBody.nombre_completo,
      'El nombre completo no puede estar vacio.',
    );
  }

  if (rawBody.documento !== undefined) input.documento = normalizeOptionalText(rawBody.documento);
  if (rawBody.telefono !== undefined) input.telefono = normalizeOptionalText(rawBody.telefono);
  if (rawBody.telefono_secundario !== undefined) {
    input.telefonoSecundario = normalizeOptionalText(rawBody.telefono_secundario);
  }
  if (rawBody.direccion !== undefined) input.direccion = normalizeOptionalText(rawBody.direccion);
  if (rawBody.ciudad !== undefined) input.ciudad = normalizeOptionalText(rawBody.ciudad);
  if (rawBody.correo !== undefined) {
    input.correo = normalizeOptionalText(rawBody.correo)?.toLowerCase() ?? null;
    validateEmail(input.correo);
  }
  if (rawBody.observaciones !== undefined) {
    input.observaciones = normalizeOptionalText(rawBody.observaciones);
  }

  return input;
}

export function validateUpdateClientStatusInput(body: unknown): UpdateClientStatusInput {
  const rawBody = body as RawUpdateStatusBody;

  if (
    typeof rawBody?.estado !== 'string' ||
    !VALID_STATUSES.includes(rawBody.estado as ClientStatus)
  ) {
    throw new ApiError('INVALID_CLIENT_STATUS', 'El estado del cliente no es valido.', 400);
  }

  return {
    estado: rawBody.estado as ClientStatus,
  };
}

export function validateListClientsFilters(searchParams: URLSearchParams): ListClientsFilters {
  const estado = searchParams.get('estado');

  if (estado && !VALID_STATUSES.includes(estado as ClientStatus)) {
    throw new ApiError('INVALID_CLIENT_STATUS', 'El estado del cliente no es valido.', 400);
  }

  return {
    buscar: normalizeOptionalText(searchParams.get('buscar')) ?? undefined,
    estado: estado ? (estado as ClientStatus) : undefined,
    telefono: normalizeOptionalText(searchParams.get('telefono')) ?? undefined,
    documento: normalizeOptionalText(searchParams.get('documento')) ?? undefined,
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
