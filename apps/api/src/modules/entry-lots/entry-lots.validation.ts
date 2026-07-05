import { ApiError } from '../../shared/errors';
import type {
  CancelEntryLotInput,
  CreateEntryLotDetailInput,
  CreateEntryLotInput,
  EntryLotStatus,
  ListEntryLotsFilters,
  UpdateEntryLotDetailInput,
  UpdateEntryLotInput,
} from './entry-lots.types';

const ENTRY_LOT_STATUSES: EntryLotStatus[] = ['BORRADOR', 'CONFIRMADO', 'ANULADO'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const LOT_FIELDS = ['id_proveedor', 'numero_factura', 'fecha_lote', 'observaciones'];
const DETAIL_UPDATE_FIELDS = [
  'cantidad',
  'costo_unitario',
  'precio_venta_sugerido',
  'cantidad_etiquetas_qr',
  'observaciones',
];

interface RawEntryLotBody {
  id_proveedor?: unknown;
  numero_factura?: unknown;
  fecha_lote?: unknown;
  observaciones?: unknown;
}

interface RawEntryLotDetailBody {
  id_variante?: unknown;
  cantidad?: unknown;
  costo_unitario?: unknown;
  subtotal?: unknown;
  precio_venta_sugerido?: unknown;
  cantidad_etiquetas_qr?: unknown;
  observaciones?: unknown;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (typeof value !== 'string') {
    throw new ApiError('INVALID_TEXT_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeRequiredText(value: unknown, code: string, message: string): string {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    throw new ApiError(code, message, 400);
  }

  return normalizedValue;
}

function normalizeDate(value: unknown): string {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return new Date().toISOString();
  }

  if (Number.isNaN(Date.parse(normalizedValue))) {
    throw new ApiError('INVALID_ENTRY_LOT_DATE', 'La fecha del lote no es valida.', 400);
  }

  return normalizedValue;
}

function normalizeOptionalDate(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return normalizeDate(value);
}

function normalizePositiveInteger(value: unknown, code: string, message: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(code, message, 400);
  }

  return parsed;
}

function normalizeRequiredPositiveInteger(value: unknown, code: string, message: string): number {
  if (value === undefined || value === null || value === '') {
    throw new ApiError(code, message, 400);
  }

  return normalizePositiveInteger(value, code, message);
}

function normalizeNonNegativeInteger(
  value: unknown,
  code: string,
  message: string,
  fallback = 0,
): number {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError(code, message, 400);
  }

  return parsed;
}

function parseNumberParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('INVALID_PAGINATION', 'La paginacion enviada no es valida.', 400);
  }

  return max ? Math.min(parsed, max) : parsed;
}

function hasAllowedField(body: object, allowedFields: string[]): boolean {
  return Object.keys(body).some((field) => allowedFields.includes(field));
}

export function validateCreateEntryLotInput(body: unknown): CreateEntryLotInput {
  const rawBody = (body ?? {}) as RawEntryLotBody;

  return {
    idProveedor: normalizeOptionalText(rawBody.id_proveedor),
    numeroFactura: normalizeOptionalText(rawBody.numero_factura),
    fechaLote: normalizeDate(rawBody.fecha_lote),
    observaciones: normalizeOptionalText(rawBody.observaciones),
  };
}

export function validateUpdateEntryLotInput(body: unknown): UpdateEntryLotInput {
  const rawBody = body as RawEntryLotBody;
  const input: UpdateEntryLotInput = {};

  if (!rawBody || typeof rawBody !== 'object' || !hasAllowedField(rawBody, LOT_FIELDS)) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.id_proveedor !== undefined)
    input.idProveedor = normalizeOptionalText(rawBody.id_proveedor);
  if (rawBody.numero_factura !== undefined)
    input.numeroFactura = normalizeOptionalText(rawBody.numero_factura);
  if (rawBody.fecha_lote !== undefined) input.fechaLote = normalizeOptionalDate(rawBody.fecha_lote);
  if (rawBody.observaciones !== undefined)
    input.observaciones = normalizeOptionalText(rawBody.observaciones);

  return input;
}

export function validateCreateEntryLotDetailInput(body: unknown): CreateEntryLotDetailInput {
  const rawBody = body as RawEntryLotDetailBody;

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('INVALID_ENTRY_LOT_DETAIL', 'El detalle del lote no es valido.', 400);
  }

  const cantidad = normalizePositiveInteger(
    rawBody.cantidad,
    'INVALID_ENTRY_LOT_DETAIL_QUANTITY',
    'La cantidad debe ser mayor que 0.',
  );

  return {
    idVariante: normalizeRequiredText(
      rawBody.id_variante,
      'INVALID_ENTRY_LOT_DETAIL_VARIANT',
      'La variante del detalle es obligatoria.',
    ),
    cantidad,
    costoUnitario: normalizeRequiredPositiveInteger(
      rawBody.costo_unitario,
      'INVALID_ENTRY_LOT_DETAIL_COST',
      'El costo unitario es obligatorio y debe ser mayor que 0.',
    ),
    precioVentaSugerido: normalizeNonNegativeInteger(
      rawBody.precio_venta_sugerido,
      'INVALID_ENTRY_LOT_DETAIL_SUGGESTED_PRICE',
      'El precio de venta sugerido no puede ser negativo.',
    ),
    cantidadEtiquetasQr:
      rawBody.cantidad_etiquetas_qr === undefined
        ? cantidad
        : normalizeNonNegativeInteger(
            rawBody.cantidad_etiquetas_qr,
            'INVALID_ENTRY_LOT_DETAIL_LABELS',
            'La cantidad de etiquetas QR no puede ser negativa.',
          ),
    observaciones: normalizeOptionalText(rawBody.observaciones),
  };
}

export function validateUpdateEntryLotDetailInput(body: unknown): UpdateEntryLotDetailInput {
  const rawBody = body as RawEntryLotDetailBody;
  const input: UpdateEntryLotDetailInput = {};

  if (!rawBody || typeof rawBody !== 'object' || !hasAllowedField(rawBody, DETAIL_UPDATE_FIELDS)) {
    if (rawBody?.id_variante !== undefined) {
      throw new ApiError(
        'ENTRY_LOT_DETAIL_VARIANT_NOT_ALLOWED',
        'La variante del detalle no se puede cambiar desde este endpoint.',
        400,
      );
    }

    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.id_variante !== undefined) {
    throw new ApiError(
      'ENTRY_LOT_DETAIL_VARIANT_NOT_ALLOWED',
      'La variante del detalle no se puede cambiar desde este endpoint.',
      400,
    );
  }

  if (rawBody.cantidad !== undefined) {
    input.cantidad = normalizePositiveInteger(
      rawBody.cantidad,
      'INVALID_ENTRY_LOT_DETAIL_QUANTITY',
      'La cantidad debe ser mayor que 0.',
    );
  }
  if (rawBody.costo_unitario !== undefined) {
    input.costoUnitario = normalizeRequiredPositiveInteger(
      rawBody.costo_unitario,
      'INVALID_ENTRY_LOT_DETAIL_COST',
      'El costo unitario es obligatorio y debe ser mayor que 0.',
    );
  }
  if (rawBody.precio_venta_sugerido !== undefined) {
    input.precioVentaSugerido = normalizeNonNegativeInteger(
      rawBody.precio_venta_sugerido,
      'INVALID_ENTRY_LOT_DETAIL_SUGGESTED_PRICE',
      'El precio de venta sugerido no puede ser negativo.',
    );
  }
  if (rawBody.cantidad_etiquetas_qr !== undefined) {
    input.cantidadEtiquetasQr = normalizeNonNegativeInteger(
      rawBody.cantidad_etiquetas_qr,
      'INVALID_ENTRY_LOT_DETAIL_LABELS',
      'La cantidad de etiquetas QR no puede ser negativa.',
    );
  }
  if (rawBody.observaciones !== undefined) {
    input.observaciones = normalizeOptionalText(rawBody.observaciones);
  }

  return input;
}

export function validateCancelEntryLotInput(body: unknown): CancelEntryLotInput {
  const rawBody = body as { motivo?: unknown };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('INVALID_ENTRY_LOT_CANCEL', 'La anulacion del lote no es valida.', 400);
  }

  return {
    motivo: normalizeRequiredText(
      rawBody.motivo,
      'INVALID_ENTRY_LOT_CANCEL_REASON',
      'El motivo de anulacion es obligatorio.',
    ),
  };
}

export function validateListEntryLotsFilters(searchParams: URLSearchParams): ListEntryLotsFilters {
  const estado = normalizeOptionalText(searchParams.get('estado'));

  if (estado && !ENTRY_LOT_STATUSES.includes(estado as EntryLotStatus)) {
    throw new ApiError('INVALID_ENTRY_LOT_STATUS', 'El estado del lote no es valido.', 400);
  }

  return {
    estado: estado ? (estado as EntryLotStatus) : undefined,
    proveedor: normalizeOptionalText(searchParams.get('proveedor')) ?? undefined,
    buscar: normalizeOptionalText(searchParams.get('buscar')) ?? undefined,
    fechaDesde: normalizeOptionalText(searchParams.get('fecha_desde')) ?? undefined,
    fechaHasta: normalizeOptionalText(searchParams.get('fecha_hasta')) ?? undefined,
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
