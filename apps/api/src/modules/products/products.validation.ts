import { ApiError } from '../../shared/errors';
import type {
  CreateProductInput,
  ListProductsFilters,
  ProductStatus,
  UpdateProductInput,
  UpdateProductStatusInput,
} from './products.types';

const PRODUCT_STATUSES: ProductStatus[] = ['ACTIVO', 'INACTIVO'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const PRODUCT_FIELDS = [
  'nombre_producto',
  'descripcion',
  'marca',
  'referencia',
  'id_categoria',
  'visible_catalogo',
];
const FORBIDDEN_PRODUCT_FIELDS = [
  'estado',
  'stock',
  'stock_actual',
  'stock_minimo',
  'imagen_principal',
  'imagen',
];

interface RawProductBody {
  nombre_producto?: unknown;
  descripcion?: unknown;
  marca?: unknown;
  referencia?: unknown;
  id_categoria?: unknown;
  visible_catalogo?: unknown;
  estado?: unknown;
  stock?: unknown;
  stock_actual?: unknown;
  stock_minimo?: unknown;
  imagen_principal?: unknown;
  imagen?: unknown;
}

interface RawUpdateStatusBody {
  estado?: unknown;
}

export function normalizeProductName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function assertNoForbiddenFields(rawBody: RawProductBody): void {
  const forbiddenField = FORBIDDEN_PRODUCT_FIELDS.find(
    (field) => rawBody[field as keyof RawProductBody] !== undefined,
  );

  if (forbiddenField) {
    throw new ApiError(
      'PRODUCT_FIELD_NOT_ALLOWED',
      'Este campo no se puede modificar desde productos base.',
      400,
    );
  }
}

function normalizeRequiredText(value: unknown, code: string, message: string): string {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    throw new ApiError(code, message, 400);
  }

  return normalizedValue;
}

function normalizeProductNameField(value: unknown, emptyMessage: string): string {
  const nombreProducto = normalizeRequiredText(value, 'INVALID_PRODUCT_NAME', emptyMessage);

  if (nombreProducto.length < 2) {
    throw new ApiError(
      'INVALID_PRODUCT_NAME',
      'El nombre del producto debe tener al menos 2 caracteres.',
      400,
    );
  }

  return nombreProducto;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError('INVALID_PRODUCT_FIELD', 'Los campos de texto deben ser cadenas.', 400);
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeOptionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    throw new ApiError('INVALID_VISIBLE_CATALOG', 'visible_catalogo debe ser booleano.', 400);
  }

  return value;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new ApiError('INVALID_VISIBLE_CATALOG', 'visible_catalogo debe ser true o false.', 400);
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

export function validateCreateProductInput(body: unknown): CreateProductInput {
  const rawBody = body as RawProductBody;
  assertNoForbiddenFields(rawBody);

  const nombreProducto = normalizeProductNameField(
    rawBody?.nombre_producto,
    'El nombre del producto es obligatorio.',
  );
  const idCategoria = normalizeRequiredText(
    rawBody?.id_categoria,
    'INVALID_PRODUCT_CATEGORY',
    'La categoria del producto es obligatoria.',
  );

  return {
    nombreProducto,
    nombreNormalizado: normalizeProductName(nombreProducto),
    idCategoria,
    descripcion: normalizeOptionalText(rawBody?.descripcion),
    marca: normalizeOptionalText(rawBody?.marca),
    referencia: normalizeOptionalText(rawBody?.referencia),
    visibleCatalogo: normalizeOptionalBoolean(rawBody?.visible_catalogo, false),
  };
}

export function validateUpdateProductInput(body: unknown): UpdateProductInput {
  const rawBody = body as RawProductBody;
  const input: UpdateProductInput = {};

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  assertNoForbiddenFields(rawBody);

  if (Object.keys(rawBody).filter((field) => PRODUCT_FIELDS.includes(field)).length === 0) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  if (rawBody.nombre_producto !== undefined) {
    input.nombreProducto = normalizeProductNameField(
      rawBody.nombre_producto,
      'El nombre del producto no puede estar vacio.',
    );
    input.nombreNormalizado = normalizeProductName(input.nombreProducto);
  }

  if (rawBody.id_categoria !== undefined) {
    input.idCategoria = normalizeRequiredText(
      rawBody.id_categoria,
      'INVALID_PRODUCT_CATEGORY',
      'La categoria del producto no puede estar vacia.',
    );
  }

  if (rawBody.descripcion !== undefined)
    input.descripcion = normalizeOptionalText(rawBody.descripcion);
  if (rawBody.marca !== undefined) input.marca = normalizeOptionalText(rawBody.marca);
  if (rawBody.referencia !== undefined)
    input.referencia = normalizeOptionalText(rawBody.referencia);
  if (rawBody.visible_catalogo !== undefined) {
    input.visibleCatalogo = normalizeOptionalBoolean(rawBody.visible_catalogo, false);
  }

  return input;
}

export function validateUpdateProductStatusInput(body: unknown): UpdateProductStatusInput {
  const rawBody = body as RawUpdateStatusBody;

  if (
    typeof rawBody?.estado !== 'string' ||
    !PRODUCT_STATUSES.includes(rawBody.estado as ProductStatus)
  ) {
    throw new ApiError('INVALID_PRODUCT_STATUS', 'El estado del producto no es valido.', 400);
  }

  return {
    estado: rawBody.estado as ProductStatus,
  };
}

export function validateListProductsFilters(searchParams: URLSearchParams): ListProductsFilters {
  const estado = searchParams.get('estado');

  if (estado && !PRODUCT_STATUSES.includes(estado as ProductStatus)) {
    throw new ApiError('INVALID_PRODUCT_STATUS', 'El estado del producto no es valido.', 400);
  }

  return {
    buscar: normalizeOptionalText(searchParams.get('buscar')) ?? undefined,
    estado: estado ? (estado as ProductStatus) : undefined,
    categoria: normalizeOptionalText(searchParams.get('categoria')) ?? undefined,
    visibleCatalogo: parseBooleanParam(searchParams.get('visible_catalogo')),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
