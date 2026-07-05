import { ApiError } from '../../shared/errors';
import type {
  InventoryMovementType,
  InventoryReferenceType,
  ListInventoryMovementsFilters,
  ListInventoryVariantsFilters,
  ManualInventoryAdjustmentInput,
  ManualInventoryAdjustmentType,
  RegisterInitialInventoryInput,
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
const MANUAL_ADJUSTMENT_TYPES: ManualInventoryAdjustmentType[] = [
  'AJUSTE_POSITIVO',
  'AJUSTE_NEGATIVO',
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

function normalizeBodyText(value: unknown, code: string, message: string): string {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    throw new ApiError(code, message, 400);
  }

  return normalizedValue;
}

function parsePositiveInteger(value: unknown, code: string, message: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(code, message, 400);
  }

  return parsed;
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

export function validateRegisterInitialInventoryInput(
  body: unknown,
): RegisterInitialInventoryInput {
  const rawBody = body as { items?: unknown };

  if (!rawBody || typeof rawBody !== 'object' || !Array.isArray(rawBody.items)) {
    throw new ApiError(
      'INITIAL_INVENTORY_ITEMS_REQUIRED',
      'Debes enviar items de inventario inicial.',
      400,
    );
  }

  if (rawBody.items.length === 0) {
    throw new ApiError('EMPTY_INITIAL_INVENTORY', 'Debes enviar al menos un item.', 400);
  }

  const seenVariants = new Set<string>();

  return {
    items: rawBody.items.map((rawItem, index) => {
      if (!rawItem || typeof rawItem !== 'object') {
        throw new ApiError(
          'INVALID_INITIAL_INVENTORY_ITEM',
          'Cada item debe ser un objeto valido.',
          400,
        );
      }

      const item = rawItem as {
        id_variante?: unknown;
        cantidad_inicial?: unknown;
        motivo?: unknown;
      };
      const idVariante = normalizeBodyText(
        item.id_variante,
        'INITIAL_INVENTORY_VARIANT_REQUIRED',
        `La variante del item ${index + 1} es obligatoria.`,
      );

      if (seenVariants.has(idVariante)) {
        throw new ApiError(
          'DUPLICATED_INITIAL_INVENTORY_VARIANT',
          'No se puede repetir la misma variante en el inventario inicial.',
          400,
        );
      }

      seenVariants.add(idVariante);

      return {
        idVariante,
        cantidadInicial: parsePositiveInteger(
          item.cantidad_inicial,
          'INVALID_INITIAL_INVENTORY_QUANTITY',
          'La cantidad inicial debe ser mayor que 0.',
        ),
        motivo: normalizeBodyText(
          item.motivo,
          'INITIAL_INVENTORY_REASON_REQUIRED',
          'El motivo del inventario inicial es obligatorio.',
        ),
      };
    }),
  };
}

export function validateManualInventoryAdjustmentInput(
  body: unknown,
): ManualInventoryAdjustmentInput {
  const rawBody = body as {
    id_variante?: unknown;
    tipo_ajuste?: unknown;
    cantidad?: unknown;
    motivo?: unknown;
  };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError(
      'INVALID_INVENTORY_ADJUSTMENT',
      'El ajuste de inventario no es valido.',
      400,
    );
  }

  const tipoAjuste = normalizeBodyText(
    rawBody.tipo_ajuste,
    'INVENTORY_ADJUSTMENT_TYPE_REQUIRED',
    'El tipo de ajuste es obligatorio.',
  );

  if (!MANUAL_ADJUSTMENT_TYPES.includes(tipoAjuste as ManualInventoryAdjustmentType)) {
    throw new ApiError('INVALID_INVENTORY_ADJUSTMENT_TYPE', 'El tipo de ajuste no es valido.', 400);
  }

  return {
    idVariante: normalizeBodyText(
      rawBody.id_variante,
      'INVENTORY_ADJUSTMENT_VARIANT_REQUIRED',
      'La variante del ajuste es obligatoria.',
    ),
    tipoAjuste: tipoAjuste as ManualInventoryAdjustmentType,
    cantidad: parsePositiveInteger(
      rawBody.cantidad,
      'INVALID_INVENTORY_ADJUSTMENT_QUANTITY',
      'La cantidad del ajuste debe ser mayor que 0.',
    ),
    motivo: normalizeBodyText(
      rawBody.motivo,
      'INVENTORY_ADJUSTMENT_REASON_REQUIRED',
      'El motivo del ajuste es obligatorio.',
    ),
  };
}
