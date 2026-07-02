import { ApiError } from '../../shared/errors';
import type {
  CreateVariantInput,
  ListVariantsFilters,
  UpdateVariantInput,
  UpdateVariantStatusInput,
  VariantStatus,
} from './variants.types';

const VARIANT_STATUSES: VariantStatus[] = ['ACTIVA', 'INACTIVA'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const VARIANT_FIELDS = [
  'talla',
  'color',
  'sku',
  'precio_venta',
  'precio_compra_referencia',
  'stock_minimo',
];
const FORBIDDEN_FIELDS = [
  'stock_actual',
  'codigo_qr',
  'ruta_qr',
  'estado',
  'creado_por',
  'imagen_variante',
  'imagen',
];

interface RawVariantBody {
  talla?: unknown;
  color?: unknown;
  sku?: unknown;
  precio_venta?: unknown;
  precio_compra_referencia?: unknown;
  stock_minimo?: unknown;
  stock_actual?: unknown;
  codigo_qr?: unknown;
  ruta_qr?: unknown;
  estado?: unknown;
  creado_por?: unknown;
  imagen_variante?: unknown;
  imagen?: unknown;
}

interface RawUpdateStatusBody {
  estado?: unknown;
}

export function normalizeVariantPart(value: unknown, fallback: 'unica' | 'sin-color'): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new ApiError('INVALID_VARIANT_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, ' ');

  return normalizedValue.length > 0 ? normalizedValue : fallback;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError('INVALID_VARIANT_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeOptionalSku(value: unknown): string | undefined {
  const sku = normalizeOptionalText(value);
  return sku ?? undefined;
}

function parseMoney(value: unknown, fieldName: string, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ApiError(
      'INVALID_VARIANT_NUMBER',
      `${fieldName} debe ser un entero mayor o igual a 0.`,
      400,
    );
  }
  return value;
}

function assertNoForbiddenFields(rawBody: RawVariantBody): void {
  const forbidden = FORBIDDEN_FIELDS.find(
    (field) => rawBody[field as keyof RawVariantBody] !== undefined,
  );
  if (forbidden) {
    throw new ApiError(
      'VARIANT_FIELD_NOT_ALLOWED',
      'Este campo no se puede modificar desde variantes.',
      400,
    );
  }
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null || value.trim() === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError('INVALID_STOCK_LOW_FILTER', 'stock_bajo debe ser true o false.', 400);
}

function parseNumberParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('INVALID_PAGINATION', 'La paginacion enviada no es valida.', 400);
  }
  return max ? Math.min(parsed, max) : parsed;
}

export function validateCreateVariantInput(body: unknown): CreateVariantInput {
  const rawBody = body as RawVariantBody;
  assertNoForbiddenFields(rawBody);

  return {
    talla: normalizeOptionalText(rawBody?.talla),
    color: normalizeOptionalText(rawBody?.color),
    tallaNormalizada: normalizeVariantPart(rawBody?.talla, 'unica'),
    colorNormalizado: normalizeVariantPart(rawBody?.color, 'sin-color'),
    sku: normalizeOptionalSku(rawBody?.sku),
    precioVenta: parseMoney(rawBody?.precio_venta, 'precio_venta'),
    precioCompraReferencia: parseMoney(
      rawBody?.precio_compra_referencia,
      'precio_compra_referencia',
    ),
    stockMinimo: parseMoney(rawBody?.stock_minimo, 'stock_minimo'),
  };
}

export function validateUpdateVariantInput(body: unknown): UpdateVariantInput {
  const rawBody = body as RawVariantBody;
  const input: UpdateVariantInput = {};

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  assertNoForbiddenFields(rawBody);

  if (Object.keys(rawBody).filter((field) => VARIANT_FIELDS.includes(field)).length === 0) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.talla !== undefined) {
    input.talla = normalizeOptionalText(rawBody.talla);
    input.tallaNormalizada = normalizeVariantPart(rawBody.talla, 'unica');
  }
  if (rawBody.color !== undefined) {
    input.color = normalizeOptionalText(rawBody.color);
    input.colorNormalizado = normalizeVariantPart(rawBody.color, 'sin-color');
  }
  if (rawBody.sku !== undefined) input.sku = normalizeOptionalSku(rawBody.sku);
  if (rawBody.precio_venta !== undefined) {
    input.precioVenta = parseMoney(rawBody.precio_venta, 'precio_venta');
  }
  if (rawBody.precio_compra_referencia !== undefined) {
    input.precioCompraReferencia = parseMoney(
      rawBody.precio_compra_referencia,
      'precio_compra_referencia',
    );
  }
  if (rawBody.stock_minimo !== undefined) {
    input.stockMinimo = parseMoney(rawBody.stock_minimo, 'stock_minimo');
  }

  return input;
}

export function validateUpdateVariantStatusInput(body: unknown): UpdateVariantStatusInput {
  const rawBody = body as RawUpdateStatusBody;
  if (
    typeof rawBody?.estado !== 'string' ||
    !VARIANT_STATUSES.includes(rawBody.estado as VariantStatus)
  ) {
    throw new ApiError('INVALID_VARIANT_STATUS', 'El estado de la variante no es valido.', 400);
  }
  return { estado: rawBody.estado as VariantStatus };
}

export function validateListVariantsFilters(searchParams: URLSearchParams): ListVariantsFilters {
  const estado = searchParams.get('estado');
  if (estado && !VARIANT_STATUSES.includes(estado as VariantStatus)) {
    throw new ApiError('INVALID_VARIANT_STATUS', 'El estado de la variante no es valido.', 400);
  }
  return {
    buscar: normalizeOptionalText(searchParams.get('buscar')) ?? undefined,
    estado: estado ? (estado as VariantStatus) : undefined,
    producto: normalizeOptionalText(searchParams.get('producto')) ?? undefined,
    talla: normalizeOptionalText(searchParams.get('talla')) ?? undefined,
    color: normalizeOptionalText(searchParams.get('color')) ?? undefined,
    codigoQr: normalizeOptionalText(searchParams.get('codigo_qr')) ?? undefined,
    sku: normalizeOptionalText(searchParams.get('sku')) ?? undefined,
    stockBajo: parseBooleanParam(searchParams.get('stock_bajo')),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
