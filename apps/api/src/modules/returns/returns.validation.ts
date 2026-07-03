import { ApiError } from '../../shared/errors';
import type { CreateSaleReturnInput } from './returns.types';

function normalizeRequiredText(value: unknown, code: string, message: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw new ApiError(code, message, 400);
  }

  return normalized;
}

function parsePositiveInteger(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(
      'CANTIDAD_DEVOLUCION_INVALIDA',
      'La cantidad devuelta debe ser un entero mayor que 0.',
      400,
    );
  }

  return parsed;
}

export function validateCreateSaleReturnInput(body: unknown): CreateSaleReturnInput {
  const rawBody = body as {
    motivo?: unknown;
    detalles?: unknown;
  };

  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiError('DEVOLUCION_INVALIDA', 'La devolucion enviada no es valida.', 400);
  }

  if (!Array.isArray(rawBody.detalles) || rawBody.detalles.length === 0) {
    throw new ApiError(
      'DETALLES_DEVOLUCION_REQUERIDOS',
      'La devolucion debe incluir al menos un detalle.',
      400,
    );
  }

  return {
    motivo: normalizeRequiredText(
      rawBody.motivo,
      'MOTIVO_DEVOLUCION_REQUERIDO',
      'El motivo de la devolucion es obligatorio.',
    ),
    detalles: rawBody.detalles.map((detail) => {
      const rawDetail = detail as { id_detalle_venta?: unknown; cantidad_devuelta?: unknown };

      if (!rawDetail || typeof rawDetail !== 'object') {
        throw new ApiError('DETALLE_DEVOLUCION_INVALIDO', 'Un detalle no es valido.', 400);
      }

      return {
        idDetalleVenta: normalizeRequiredText(
          rawDetail.id_detalle_venta,
          'DETALLE_VENTA_REQUERIDO',
          'El detalle de venta es obligatorio.',
        ),
        cantidadDevuelta: parsePositiveInteger(rawDetail.cantidad_devuelta),
      };
    }),
  };
}
