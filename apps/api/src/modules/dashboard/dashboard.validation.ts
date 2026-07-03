import { ApiError } from '../../shared/errors';
import type { DashboardDateRange } from './dashboard.types';

function startOfUtcToday(): string {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function endOfUtcToday(): string {
  return `${new Date().toISOString().slice(0, 10)}T23:59:59.999Z`;
}

function normalizeDateParam(value: string | null, endOfDay: boolean): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError('INVALID_DATE_FILTER', 'Las fechas del filtro no son validas.', 400);
  }

  return date.toISOString();
}

export function validateDashboardDateRange(searchParams: URLSearchParams): DashboardDateRange {
  const fechaDesde =
    normalizeDateParam(searchParams.get('fecha_desde'), false) ?? startOfUtcToday();
  const fechaHasta = normalizeDateParam(searchParams.get('fecha_hasta'), true) ?? endOfUtcToday();

  if (fechaDesde > fechaHasta) {
    throw new ApiError(
      'INVALID_DATE_RANGE',
      'La fecha desde no puede ser mayor que la fecha hasta.',
      400,
    );
  }

  return { fechaDesde, fechaHasta };
}
