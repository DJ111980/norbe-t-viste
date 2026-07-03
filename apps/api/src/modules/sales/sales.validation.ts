import { ApiError } from '../../shared/errors';
import type {
  CancelCashSaleInput,
  CreateCashSaleInput,
  CreateSaleInput,
  ListSalesFilters,
  PaymentMethod,
  SaleStatus,
  SaleType,
} from './sales.types';

const PAYMENT_METHODS: PaymentMethod[] = [
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'NEQUI',
  'DAVIPLATA',
  'OTRO',
];
const SALE_STATUSES: SaleStatus[] = ['COMPLETADA', 'ANULADA'];
const SALE_TYPES: SaleType[] = ['CONTADO', 'CREDITO', 'MIXTA'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized ? normalized : null;
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

function parseOptionalPositiveInteger(
  value: unknown,
  code: string,
  message: string,
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  return parsePositiveInteger(value, code, message);
}

function parseNumberParam(value: string | null, fallback: number, max?: number): number {
  if (value === null || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError('INVALID_PAGINATION', 'La paginacion enviada no es valida.', 400);
  }

  return max ? Math.min(parsed, max) : parsed;
}

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

export function validateCreateSaleInput(body: unknown): CreateSaleInput {
  const rawBody = body as {
    tipo_venta?: unknown;
    id_cliente?: unknown;
    valor_pagado_inicial?: unknown;
    metodo_pago?: unknown;
    observaciones?: unknown;
    detalles?: unknown;
    abonos?: unknown;
  };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('INVALID_SALE', 'La venta enviada no es valida.', 400);
  }

  if (
    rawBody.tipo_venta !== 'CONTADO' &&
    rawBody.tipo_venta !== 'CREDITO' &&
    rawBody.tipo_venta !== 'MIXTA'
  ) {
    throw new ApiError('INVALID_SALE_TYPE', 'El tipo de venta no es valido.', 400);
  }

  if (rawBody.abonos !== undefined) {
    throw new ApiError(
      'SALE_INSTALLMENTS_NOT_ALLOWED',
      'La venta no debe incluir abonos en el cuerpo de la solicitud.',
      400,
    );
  }

  if (!Array.isArray(rawBody.detalles) || rawBody.detalles.length === 0) {
    throw new ApiError('SALE_DETAILS_REQUIRED', 'La venta debe tener al menos un detalle.', 400);
  }

  const seenVariants = new Set<string>();
  const detalles = rawBody.detalles.map((rawDetail, index) => {
    if (!rawDetail || typeof rawDetail !== 'object') {
      throw new ApiError('INVALID_SALE_DETAIL', 'Cada detalle debe ser un objeto valido.', 400);
    }

    const detail = rawDetail as {
      id_variante?: unknown;
      cantidad?: unknown;
      precio_unitario?: unknown;
    };
    const idVariante = normalizeRequiredText(
      detail.id_variante,
      'SALE_VARIANT_REQUIRED',
      `La variante del item ${index + 1} es obligatoria.`,
    );

    if (seenVariants.has(idVariante)) {
      throw new ApiError(
        'DUPLICATED_SALE_VARIANT',
        'No se puede repetir la misma variante en una venta.',
        400,
      );
    }

    seenVariants.add(idVariante);

    return {
      idVariante,
      cantidad: parsePositiveInteger(
        detail.cantidad,
        'INVALID_SALE_QUANTITY',
        'La cantidad vendida debe ser mayor que 0.',
      ),
      precioUnitario: parseOptionalPositiveInteger(
        detail.precio_unitario,
        'INVALID_SALE_UNIT_PRICE',
        'El precio unitario debe ser mayor que 0.',
      ),
    };
  });

  if (rawBody.tipo_venta === 'CREDITO') {
    if (rawBody.metodo_pago !== undefined && rawBody.metodo_pago !== null) {
      throw new ApiError(
        'CREDIT_SALE_PAYMENT_NOT_ALLOWED',
        'La venta a credito no debe incluir metodo de pago inicial.',
        400,
      );
    }

    return {
      tipoVenta: 'CREDITO',
      idCliente: normalizeRequiredText(
        rawBody.id_cliente,
        'CREDIT_SALE_CLIENT_REQUIRED',
        'El cliente es obligatorio para una venta a credito.',
      ),
      observaciones: normalizeOptionalText(rawBody.observaciones),
      detalles,
    };
  }

  const metodoPago = normalizeRequiredText(
    rawBody.metodo_pago,
    'PAYMENT_METHOD_REQUIRED',
    'El metodo de pago es obligatorio.',
  );

  if (!PAYMENT_METHODS.includes(metodoPago as PaymentMethod)) {
    throw new ApiError('INVALID_PAYMENT_METHOD', 'El metodo de pago no es valido.', 400);
  }

  if (rawBody.tipo_venta === 'MIXTA') {
    return {
      tipoVenta: 'MIXTA',
      idCliente: normalizeRequiredText(
        rawBody.id_cliente,
        'MIXED_SALE_CLIENT_REQUIRED',
        'El cliente es obligatorio para una venta mixta.',
      ),
      valorPagadoInicial: parsePositiveInteger(
        rawBody.valor_pagado_inicial,
        'INVALID_MIXED_SALE_INITIAL_PAYMENT',
        'El pago inicial de una venta mixta debe ser mayor que 0.',
      ),
      metodoPago: metodoPago as PaymentMethod,
      observaciones: normalizeOptionalText(rawBody.observaciones),
      detalles,
    };
  }

  return {
    tipoVenta: 'CONTADO',
    idCliente: normalizeOptionalText(rawBody.id_cliente),
    metodoPago: metodoPago as PaymentMethod,
    observaciones: normalizeOptionalText(rawBody.observaciones),
    detalles,
  };
}

export const validateCreateCashSaleInput = validateCreateSaleInput as (
  body: unknown,
) => CreateCashSaleInput;

export function validateCancelCashSaleInput(body: unknown): CancelCashSaleInput {
  const rawBody = body as { motivo_anulacion?: unknown };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('INVALID_SALE_CANCELLATION', 'La anulacion enviada no es valida.', 400);
  }

  return {
    motivoAnulacion: normalizeRequiredText(
      rawBody.motivo_anulacion,
      'SALE_CANCELLATION_REASON_REQUIRED',
      'El motivo de anulacion es obligatorio.',
    ),
  };
}

export function validateListSalesFilters(searchParams: URLSearchParams): ListSalesFilters {
  const estado = normalizeParamText(searchParams.get('estado'));
  const tipoVenta = normalizeParamText(searchParams.get('tipo_venta'));

  if (estado && !SALE_STATUSES.includes(estado as SaleStatus)) {
    throw new ApiError('INVALID_SALE_STATUS', 'El estado de venta no es valido.', 400);
  }

  if (tipoVenta && !SALE_TYPES.includes(tipoVenta as SaleType)) {
    throw new ApiError('INVALID_SALE_TYPE', 'El tipo de venta no es valido.', 400);
  }

  return {
    buscar: normalizeParamText(searchParams.get('buscar')),
    estado: estado as SaleStatus | undefined,
    tipoVenta: tipoVenta as SaleType | undefined,
    cliente: normalizeParamText(searchParams.get('cliente')),
    vendedor: normalizeParamText(searchParams.get('vendedor')),
    fechaDesde: parseDateParam(searchParams.get('fecha_desde'), 'INVALID_FROM_DATE'),
    fechaHasta: parseDateParam(searchParams.get('fecha_hasta'), 'INVALID_TO_DATE'),
    limit: parseNumberParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT),
    offset: parseNumberParam(searchParams.get('offset'), 0),
  };
}
