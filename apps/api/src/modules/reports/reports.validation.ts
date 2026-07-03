import { ApiError } from '../../shared/errors';
import type {
  EntryLotsReportFilters,
  InventoryMovementReportFilters,
  InventoryReportFilters,
  PaginationInput,
  PortfolioReportFilters,
  ReturnsReportFilters,
  SalesReportFilters,
} from './reports.types';

const MAX_PAGE_SIZE = 100;

function parsePagination(searchParams: URLSearchParams): PaginationInput {
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('page_size') ?? '50');

  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError('INVALID_PAGE', 'La pagina debe ser un entero mayor que 0.', 400);
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new ApiError(
      'INVALID_PAGE_SIZE',
      `El tamano de pagina debe estar entre 1 y ${MAX_PAGE_SIZE}.`,
      400,
    );
  }

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

function parseDate(value: string | null, field: string, endOfDay: boolean): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError('INVALID_DATE_FILTER', `El filtro ${field} no es una fecha valida.`, 400);
  }

  return date.toISOString();
}

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (!value) return undefined;
  if (!allowed.includes(value as T)) {
    throw new ApiError('INVALID_FILTER', `El filtro ${field} no es valido.`, 400);
  }
  return value as T;
}

function parseBoolean(value: string | null, field: string): boolean | undefined {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError('INVALID_FILTER', `El filtro ${field} debe ser true o false.`, 400);
}

function assertDateRange(fechaDesde?: string, fechaHasta?: string): void {
  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    throw new ApiError(
      'INVALID_DATE_RANGE',
      'La fecha desde no puede ser mayor que la fecha hasta.',
      400,
    );
  }
}

export function validateSalesReportFilters(searchParams: URLSearchParams): SalesReportFilters {
  const fechaDesde = parseDate(searchParams.get('fecha_desde'), 'fecha_desde', false);
  const fechaHasta = parseDate(searchParams.get('fecha_hasta'), 'fecha_hasta', true);
  assertDateRange(fechaDesde, fechaHasta);

  return {
    ...parsePagination(searchParams),
    fechaDesde,
    fechaHasta,
    tipoVenta: parseEnum(
      searchParams.get('tipo_venta'),
      ['CONTADO', 'CREDITO', 'MIXTA'],
      'tipo_venta',
    ),
    estadoVenta: parseEnum(
      searchParams.get('estado_venta'),
      ['COMPLETADA', 'ANULADA'],
      'estado_venta',
    ),
    idCliente: searchParams.get('id_cliente') ?? undefined,
    idUsuario: searchParams.get('id_usuario') ?? undefined,
  };
}

export function validateInventoryReportFilters(
  searchParams: URLSearchParams,
): InventoryReportFilters {
  return {
    ...parsePagination(searchParams),
    q: searchParams.get('q') ?? undefined,
    idProducto: searchParams.get('id_producto') ?? undefined,
    idCategoria: searchParams.get('id_categoria') ?? undefined,
    estadoVariante: parseEnum(
      searchParams.get('estado_variante'),
      ['ACTIVA', 'INACTIVA'],
      'estado_variante',
    ),
    bajoStock: parseBoolean(searchParams.get('bajo_stock'), 'bajo_stock'),
    sinStock: parseBoolean(searchParams.get('sin_stock'), 'sin_stock'),
  };
}

export function validateInventoryMovementReportFilters(
  searchParams: URLSearchParams,
): InventoryMovementReportFilters {
  const fechaDesde = parseDate(searchParams.get('fecha_desde'), 'fecha_desde', false);
  const fechaHasta = parseDate(searchParams.get('fecha_hasta'), 'fecha_hasta', true);
  assertDateRange(fechaDesde, fechaHasta);

  return {
    ...parsePagination(searchParams),
    fechaDesde,
    fechaHasta,
    idVariante: searchParams.get('id_variante') ?? undefined,
    tipoMovimiento: parseEnum(
      searchParams.get('tipo_movimiento'),
      [
        'LOTE_ENTRADA',
        'INVENTARIO_INICIAL',
        'AJUSTE_POSITIVO',
        'AJUSTE_NEGATIVO',
        'VENTA',
        'ANULACION_VENTA',
        'DEVOLUCION',
      ],
      'tipo_movimiento',
    ),
    referenciaTipo: parseEnum(
      searchParams.get('referencia_tipo'),
      [
        'LOTE_ENTRADA',
        'INVENTARIO_INICIAL',
        'AJUSTE_INVENTARIO',
        'VENTA',
        'ANULACION_VENTA',
        'DEVOLUCION',
      ],
      'referencia_tipo',
    ),
    referenciaId: searchParams.get('referencia_id') ?? undefined,
  };
}

export function validatePortfolioReportFilters(
  searchParams: URLSearchParams,
): PortfolioReportFilters {
  return {
    ...parsePagination(searchParams),
    idCliente: searchParams.get('id_cliente') ?? undefined,
    estadoCredito: parseEnum(
      searchParams.get('estado_credito'),
      ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO'],
      'estado_credito',
    ),
    origenCredito: parseEnum(
      searchParams.get('origen_credito'),
      ['VENTA', 'DEUDA_ANTIGUA', 'AJUSTE_MANUAL'],
      'origen_credito',
    ),
  };
}

export function validateReturnsReportFilters(searchParams: URLSearchParams): ReturnsReportFilters {
  const fechaDesde = parseDate(searchParams.get('fecha_desde'), 'fecha_desde', false);
  const fechaHasta = parseDate(searchParams.get('fecha_hasta'), 'fecha_hasta', true);
  assertDateRange(fechaDesde, fechaHasta);

  return {
    ...parsePagination(searchParams),
    fechaDesde,
    fechaHasta,
    tipoVenta: parseEnum(
      searchParams.get('tipo_venta'),
      ['CONTADO', 'CREDITO', 'MIXTA'],
      'tipo_venta',
    ),
    estadoDevolucion: parseEnum(
      searchParams.get('estado_devolucion'),
      ['ACTIVA', 'ANULADA'],
      'estado_devolucion',
    ),
    idVenta: searchParams.get('id_venta') ?? undefined,
  };
}

export function validateEntryLotsReportFilters(
  searchParams: URLSearchParams,
): EntryLotsReportFilters {
  const fechaDesde = parseDate(searchParams.get('fecha_desde'), 'fecha_desde', false);
  const fechaHasta = parseDate(searchParams.get('fecha_hasta'), 'fecha_hasta', true);
  assertDateRange(fechaDesde, fechaHasta);

  return {
    ...parsePagination(searchParams),
    fechaDesde,
    fechaHasta,
    estadoLote: parseEnum(
      searchParams.get('estado_lote'),
      ['BORRADOR', 'CONFIRMADO', 'ANULADO'],
      'estado_lote',
    ),
    idProveedor: searchParams.get('id_proveedor') ?? undefined,
  };
}
