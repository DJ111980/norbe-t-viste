import { ApiError } from '../../shared/errors';
import type {
  CreateCreditPaymentInput,
  CreateOldDebtInput,
  CreditOrigin,
  CreditStatus,
  ListClientCreditsFilters,
  ListCreditsFilters,
  OldDebtType,
  PaymentMethod,
} from './credits.types';

const CREDIT_STATUSES: CreditStatus[] = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO'];
const CREDIT_ORIGINS: CreditOrigin[] = ['VENTA', 'DEUDA_ANTIGUA', 'AJUSTE_MANUAL'];
const OLD_DEBT_TYPES: OldDebtType[] = ['SOLO_MONTO', 'CON_PRODUCTOS'];
const PAYMENT_METHODS: PaymentMethod[] = [
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'NEQUI',
  'DAVIPLATA',
  'OTRO',
];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function normalizeParamText(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeRequiredText(value: unknown, code: string, message: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw new ApiError(code, message, 400);
  }

  return normalized;
}

function parsePositiveInteger(value: unknown, code: string, message: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(code, message, 400);
  }

  return parsed;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized : null;
}

function parseNumberParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('INVALID_PAGINATION', 'La paginacion enviada no es valida.', 400);
  }

  return max ? Math.min(parsed, max) : parsed;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null || value.trim() === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError('INVALID_BOOLEAN_FILTER', 'El filtro booleano debe ser true o false.', 400);
}

function parseDateParam(value: string | null, code: string): string | undefined {
  const normalized = normalizeParamText(value);
  if (!normalized) return undefined;
  if (Number.isNaN(Date.parse(normalized))) {
    throw new ApiError(code, 'La fecha enviada no es valida.', 400);
  }
  return normalized;
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

export function validateListCreditsFilters(searchParams: URLSearchParams): ListCreditsFilters {
  return {
    cliente: normalizeParamText(searchParams.get('cliente')),
    estado: parseCreditStatus(normalizeParamText(searchParams.get('estado'))),
    origenCredito: parseCreditOrigin(normalizeParamText(searchParams.get('origen_credito'))),
    saldoPendiente: parseBooleanParam(searchParams.get('saldo_pendiente')),
    fechaDesde: parseDateParam(searchParams.get('fecha_desde'), 'INVALID_FROM_DATE'),
    fechaHasta: parseDateParam(searchParams.get('fecha_hasta'), 'INVALID_TO_DATE'),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}

export function validateListClientCreditsFilters(
  searchParams: URLSearchParams,
): ListClientCreditsFilters {
  return {
    estado: parseCreditStatus(normalizeParamText(searchParams.get('estado'))),
    origenCredito: parseCreditOrigin(normalizeParamText(searchParams.get('origen_credito'))),
    saldoPendiente: parseBooleanParam(searchParams.get('saldo_pendiente')),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}

export function validateCreateOldDebtInput(body: unknown): CreateOldDebtInput {
  const rawBody = body as {
    id_cliente?: unknown;
    monto_inicial?: unknown;
    descripcion?: unknown;
    tipo_deuda_antigua?: unknown;
  };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('INVALID_OLD_DEBT', 'La deuda antigua enviada no es valida.', 400);
  }

  const tipoDeudaAntigua = normalizeRequiredText(
    rawBody.tipo_deuda_antigua,
    'OLD_DEBT_TYPE_REQUIRED',
    'El tipo de deuda antigua es obligatorio.',
  );

  if (!OLD_DEBT_TYPES.includes(tipoDeudaAntigua as OldDebtType)) {
    throw new ApiError('INVALID_OLD_DEBT_TYPE', 'El tipo de deuda antigua no es valido.', 400);
  }

  return {
    idCliente: normalizeRequiredText(
      rawBody.id_cliente,
      'OLD_DEBT_CLIENT_REQUIRED',
      'El cliente es obligatorio.',
    ),
    montoInicial: parsePositiveInteger(
      rawBody.monto_inicial,
      'INVALID_OLD_DEBT_AMOUNT',
      'El monto inicial debe ser mayor que 0.',
    ),
    descripcion: normalizeRequiredText(
      rawBody.descripcion,
      'OLD_DEBT_DESCRIPTION_REQUIRED',
      'La descripcion de la deuda antigua es obligatoria.',
    ),
    tipoDeudaAntigua: tipoDeudaAntigua as OldDebtType,
  };
}

export function validateCreateCreditPaymentInput(body: unknown): CreateCreditPaymentInput {
  const rawBody = body as {
    valor_abono?: unknown;
    metodo_pago?: unknown;
    referencia_pago?: unknown;
    observaciones?: unknown;
  };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('INVALID_CREDIT_PAYMENT', 'El abono enviado no es valido.', 400);
  }

  const metodoPago = normalizeRequiredText(
    rawBody.metodo_pago,
    'PAYMENT_METHOD_REQUIRED',
    'El metodo de pago es obligatorio.',
  );

  if (!PAYMENT_METHODS.includes(metodoPago as PaymentMethod)) {
    throw new ApiError('INVALID_PAYMENT_METHOD', 'El metodo de pago no es valido.', 400);
  }

  return {
    valorAbono: parsePositiveInteger(
      rawBody.valor_abono,
      'INVALID_CREDIT_PAYMENT_AMOUNT',
      'El valor del abono debe ser mayor que 0.',
    ),
    metodoPago: metodoPago as PaymentMethod,
    referenciaPago: normalizeOptionalText(rawBody.referencia_pago),
    observaciones: normalizeOptionalText(rawBody.observaciones),
  };
}
