import { ApiError } from '../../shared/errors';
import type { CreditOrigin, CreditStatus } from '../credits/credits.types';
import type { PortfolioFilters } from './portfolio.types';

const CREDIT_STATUSES: CreditStatus[] = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO'];
const CREDIT_ORIGINS: CreditOrigin[] = ['VENTA', 'DEUDA_ANTIGUA', 'AJUSTE_MANUAL'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function normalizeParamText(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseDateParam(value: string | null, code: string): string | undefined {
  const normalized = normalizeParamText(value);
  if (!normalized) return undefined;
  if (Number.isNaN(Date.parse(normalized))) {
    throw new ApiError(code, 'La fecha enviada no es valida.', 400);
  }
  return normalized;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null || value.trim() === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError('INVALID_BOOLEAN_FILTER', 'El filtro booleano debe ser true o false.', 400);
}

function parsePaginationParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || (max !== undefined && parsed > max)) {
    throw new ApiError(
      'INVALID_PAGINATION',
      'La paginacion enviada no es valida. El limite maximo es 100.',
      400,
    );
  }

  return parsed;
}

function parseCreditStatus(value: string | undefined): CreditStatus | undefined {
  if (!value) return undefined;
  if (!CREDIT_STATUSES.includes(value as CreditStatus)) {
    throw new ApiError('INVALID_CREDIT_STATUS', 'El estado del credito no es valido.', 400);
  }
  return value as CreditStatus;
}

function parseCreditOrigin(value: string | undefined): CreditOrigin | undefined {
  if (!value) return undefined;
  if (!CREDIT_ORIGINS.includes(value as CreditOrigin)) {
    throw new ApiError('INVALID_CREDIT_ORIGIN', 'El origen del credito no es valido.', 400);
  }
  return value as CreditOrigin;
}

export function validatePortfolioFilters(searchParams: URLSearchParams): PortfolioFilters {
  return {
    cliente: normalizeParamText(searchParams.get('cliente')),
    estado: parseCreditStatus(normalizeParamText(searchParams.get('estado'))),
    origenCredito: parseCreditOrigin(normalizeParamText(searchParams.get('origen_credito'))),
    saldoPendiente: parseBooleanParam(searchParams.get('saldo_pendiente')),
    fechaDesde: parseDateParam(searchParams.get('fecha_desde'), 'INVALID_FROM_DATE'),
    fechaHasta: parseDateParam(searchParams.get('fecha_hasta'), 'INVALID_TO_DATE'),
    limit: parsePaginationParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parsePaginationParam(searchParams.get('offset'), 0),
  };
}
