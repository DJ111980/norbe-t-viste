import { ApiError } from '../../shared/errors';
import type {
  InventoryMovementType,
  InventoryReferenceType,
  ListInventoryMovementsFilters,
  ListInventoryVariantsFilters,
} from './inventory.types';

const VARIANT_STATUSES = ['ACTIVA', 'INACTIVA'] as const;
const MOVEMENT_TYPES: InventoryMovementType[] = [
  'LOTE_ENTRADA',
  'INVENTARIO_INICIAL',
  'AJUSTE_POSITIVO',
  'AJUSTE_NEGATIVO',
  'VENTA',
  'ANULACION_VENTA',
  'DEVOLUCION',
];
const REFERENCE_TYPES: InventoryReferenceType[] = [
  'LOTE_ENTRADA',
  'INVENTARIO_INICIAL',
  'AJUSTE_INVENTARIO',
  'VENTA',
  'ANULACION_VENTA',
  'DEVOLUCION',
];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function normalizeOptionalText(value: string | null): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null || value.trim() === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError('INVALID_BOOLEAN_FILTER', 'El filtro booleano debe ser true o false.', 400);
}

function parseNumberParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('INVALID_PAGINATION', 'La paginacion enviada no es valida.', 400);
  }

  return max ? Math.min(parsed, max) : parsed;
}

function parseDateParam(value: string | null, code: string): string | undefined {
  const normalizedValue = normalizeOptionalText(value);
  if (!normalizedValue) return undefined;
  if (Number.isNaN(Date.parse(normalizedValue))) {
    throw new ApiError(code, 'La fecha enviada no es valida.', 400);
  }
  return normalizedValue;
}

export function validateListInventoryVariantsFilters(
  searchParams: URLSearchParams,
): ListInventoryVariantsFilters {
  const estado = normalizeOptionalText(searchParams.get('estado'));

  if (estado && !VARIANT_STATUSES.includes(estado as (typeof VARIANT_STATUSES)[number])) {
    throw new ApiError('INVALID_VARIANT_STATUS', 'El estado de la variante no es valido.', 400);
  }

  return {
    buscar: normalizeOptionalText(searchParams.get('buscar')),
    estado: estado as ListInventoryVariantsFilters['estado'],
    producto: normalizeOptionalText(searchParams.get('producto')),
    categoria: normalizeOptionalText(searchParams.get('categoria')),
    talla: normalizeOptionalText(searchParams.get('talla')),
    color: normalizeOptionalText(searchParams.get('color')),
    sku: normalizeOptionalText(searchParams.get('sku')),
    codigoQr: normalizeOptionalText(searchParams.get('codigo_qr')),
    stockBajo: parseBooleanParam(searchParams.get('stock_bajo')),
    sinStock: parseBooleanParam(searchParams.get('sin_stock')),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}

export function validateListInventoryMovementsFilters(
  searchParams: URLSearchParams,
): ListInventoryMovementsFilters {
  const tipoMovimiento = normalizeOptionalText(searchParams.get('tipo_movimiento'));
  const referenciaTipo = normalizeOptionalText(searchParams.get('referencia_tipo'));

  if (tipoMovimiento && !MOVEMENT_TYPES.includes(tipoMovimiento as InventoryMovementType)) {
    throw new ApiError('INVALID_MOVEMENT_TYPE', 'El tipo de movimiento no es valido.', 400);
  }

  if (referenciaTipo && !REFERENCE_TYPES.includes(referenciaTipo as InventoryReferenceType)) {
    throw new ApiError('INVALID_REFERENCE_TYPE', 'El tipo de referencia no es valido.', 400);
  }

  return {
    variante: normalizeOptionalText(searchParams.get('variante')),
    producto: normalizeOptionalText(searchParams.get('producto')),
    tipoMovimiento: tipoMovimiento as InventoryMovementType | undefined,
    referenciaTipo: referenciaTipo as InventoryReferenceType | undefined,
    referenciaId: normalizeOptionalText(searchParams.get('referencia_id')),
    fechaDesde: parseDateParam(searchParams.get('fecha_desde'), 'INVALID_FROM_DATE'),
    fechaHasta: parseDateParam(searchParams.get('fecha_hasta'), 'INVALID_TO_DATE'),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
