import { ApiError } from '../../shared/errors';
import type {
  CategoryStatus,
  CreateCategoryInput,
  ListCategoriesFilters,
  UpdateCategoryInput,
  UpdateCategoryStatusInput,
} from './categories.types';

const CATEGORY_STATUSES: CategoryStatus[] = ['ACTIVA', 'INACTIVA'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CATEGORY_FIELDS = ['nombre_categoria', 'descripcion'];

interface RawCategoryBody {
  nombre_categoria?: unknown;
  descripcion?: unknown;
}

interface RawUpdateStatusBody {
  estado?: unknown;
}

export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeRequiredName(value: unknown, emptyMessage: string): string {
  const nombreCategoria = typeof value === 'string' ? value.trim() : '';

  if (!nombreCategoria) {
    throw new ApiError('INVALID_CATEGORY_NAME', emptyMessage, 400);
  }

  if (nombreCategoria.length < 2) {
    throw new ApiError(
      'INVALID_CATEGORY_NAME',
      'El nombre de la categoria debe tener al menos 2 caracteres.',
      400,
    );
  }

  return nombreCategoria;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError('INVALID_CATEGORY_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
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

export function validateCreateCategoryInput(body: unknown): CreateCategoryInput {
  const rawBody = body as RawCategoryBody;
  const nombreCategoria = normalizeRequiredName(
    rawBody?.nombre_categoria,
    'El nombre de la categoria es obligatorio.',
  );

  return {
    nombreCategoria,
    nombreNormalizado: normalizeCategoryName(nombreCategoria),
    descripcion: normalizeOptionalText(rawBody?.descripcion),
  };
}

export function validateUpdateCategoryInput(body: unknown): UpdateCategoryInput {
  const rawBody = body as RawCategoryBody;
  const input: UpdateCategoryInput = {};

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (Object.keys(rawBody).filter((field) => CATEGORY_FIELDS.includes(field)).length === 0) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.nombre_categoria !== undefined) {
    input.nombreCategoria = normalizeRequiredName(
      rawBody.nombre_categoria,
      'El nombre de la categoria no puede estar vacio.',
    );
    input.nombreNormalizado = normalizeCategoryName(input.nombreCategoria);
  }

  if (rawBody.descripcion !== undefined) {
    input.descripcion = normalizeOptionalText(rawBody.descripcion);
  }

  return input;
}

export function validateUpdateCategoryStatusInput(body: unknown): UpdateCategoryStatusInput {
  const rawBody = body as RawUpdateStatusBody;

  if (
    typeof rawBody?.estado !== 'string' ||
    !CATEGORY_STATUSES.includes(rawBody.estado as CategoryStatus)
  ) {
    throw new ApiError('INVALID_CATEGORY_STATUS', 'El estado de la categoria no es valido.', 400);
  }

  return {
    estado: rawBody.estado as CategoryStatus,
  };
}

export function validateListCategoriesFilters(
  searchParams: URLSearchParams,
): ListCategoriesFilters {
  const estado = searchParams.get('estado');

  if (estado && !CATEGORY_STATUSES.includes(estado as CategoryStatus)) {
    throw new ApiError('INVALID_CATEGORY_STATUS', 'El estado de la categoria no es valido.', 400);
  }

  return {
    buscar: normalizeOptionalText(searchParams.get('buscar')) ?? undefined,
    estado: estado ? (estado as CategoryStatus) : undefined,
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
