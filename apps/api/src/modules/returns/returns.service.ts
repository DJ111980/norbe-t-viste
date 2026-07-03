import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicSaleReturn } from './returns.mapper';
import * as returnsRepository from './returns.repository';
import type {
  CreateSaleReturnInput,
  CreateSaleReturnResult,
  PublicSaleReturn,
  SaleReturnDetailToCreate,
} from './returns.types';

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function createSaleReturn(
  env: ApiEnv,
  auth: AuthContext,
  idVenta: string,
  input: CreateSaleReturnInput,
): Promise<CreateSaleReturnResult> {
  const sale = await returnsRepository.findSaleForReturn(env, idVenta);

  if (!sale) {
    throw new ApiError('VENTA_NO_ENCONTRADA', 'La venta no existe.', 404);
  }

  if (sale.tipo_venta !== 'CONTADO') {
    throw new ApiError(
      'DEVOLUCION_SOLO_CONTADO_POR_AHORA',
      'Por ahora solo se permiten devoluciones de ventas de contado.',
      400,
    );
  }

  if (sale.estado_venta === 'ANULADA') {
    throw new ApiError(
      'VENTA_ANULADA_NO_DEVOLUBLE',
      'No se puede registrar devolucion sobre una venta anulada.',
      400,
    );
  }

  const requestedDetails = mergeRequestedDetails(input.detalles);
  const details = await returnsRepository.findDetailsForReturn(
    env,
    requestedDetails.map((detail) => detail.idDetalleVenta),
  );
  const detailsById = new Map(details.map((detail) => [detail.id_detalle_venta, detail]));
  const idDevolucion = createId('dev');
  const detailsToCreate: SaleReturnDetailToCreate[] = [];

  for (const requestedDetail of requestedDetails) {
    const saleDetail = detailsById.get(requestedDetail.idDetalleVenta);

    if (!saleDetail) {
      throw new ApiError(
        'VARIANTE_HISTORICA_NO_ENCONTRADA',
        'No se encontro la variante historica del detalle de venta.',
        400,
      );
    }

    if (saleDetail.id_venta !== idVenta) {
      throw new ApiError(
        'DETALLE_NO_PERTENECE_A_VENTA',
        'El detalle no pertenece a la venta indicada.',
        400,
      );
    }

    const cantidadDisponible = saleDetail.cantidad - saleDetail.cantidad_devuelta_activa;

    if (cantidadDisponible <= 0 || requestedDetail.cantidadDevuelta > cantidadDisponible) {
      throw new ApiError(
        'CANTIDAD_DEVOLUCION_EXCEDE_DISPONIBLE',
        'La cantidad devuelta excede la cantidad disponible para devolver.',
        400,
      );
    }

    detailsToCreate.push({
      idDetalleDevolucion: createId('devdet'),
      idDetalleVenta: saleDetail.id_detalle_venta,
      idVariante: saleDetail.id_variante,
      cantidadDevuelta: requestedDetail.cantidadDevuelta,
      precioUnitario: saleDetail.precio_unitario,
      subtotalDevuelto: requestedDetail.cantidadDevuelta * saleDetail.precio_unitario,
      stockAntes: saleDetail.stock_actual,
      stockDespues: saleDetail.stock_actual + requestedDetail.cantidadDevuelta,
      idMovimiento: createId('mov'),
    });
  }

  const totalDevuelto = detailsToCreate.reduce(
    (total, detail) => total + detail.subtotalDevuelto,
    0,
  );
  const sideEffectsBefore = await returnsRepository.countSaleSideEffects(env, idVenta);

  await returnsRepository.createSaleReturn(env, {
    idDevolucion,
    idVenta,
    tipoVenta: 'CONTADO',
    motivo: input.motivo,
    totalDevuelto,
    impactoCredito: 0,
    impactoPago: totalDevuelto,
    creadoPor: auth.user.id_usuario,
    detalles: detailsToCreate,
  });

  const persistence = await returnsRepository.getSaleReturnPersistenceStatus(
    env,
    idVenta,
    idDevolucion,
    detailsToCreate.map((detail) => ({
      idVariante: detail.idVariante,
      stockDespues: detail.stockDespues,
    })),
  );

  if (
    !persistence.returnExists ||
    persistence.detailsCount !== detailsToCreate.length ||
    persistence.movementCount !== detailsToCreate.length ||
    persistence.stockMatchesCount !== detailsToCreate.length ||
    persistence.saleStatus !== 'COMPLETADA' ||
    persistence.paymentCount !== sideEffectsBefore.paymentCount ||
    persistence.creditCount !== sideEffectsBefore.creditCount ||
    persistence.creditPaymentCount !== sideEffectsBefore.creditPaymentCount ||
    persistence.creditAdjustmentCount !== sideEffectsBefore.creditAdjustmentCount
  ) {
    throw new ApiError(
      'DEVOLUCION_INCONSISTENTE',
      'No se pudo registrar la devolucion de forma consistente.',
      409,
    );
  }

  return {
    id_devolucion: idDevolucion,
    id_venta: idVenta,
    tipo_venta: 'CONTADO',
    estado_devolucion: 'ACTIVA',
    total_devuelto: totalDevuelto,
    impacto_credito: 0,
    impacto_pago: totalDevuelto,
    items_devueltos: detailsToCreate.length,
    movimientos_creados: detailsToCreate.length,
  };
}

export async function listSaleReturns(env: ApiEnv, idVenta: string): Promise<PublicSaleReturn[]> {
  const sale = await returnsRepository.findSaleForReturn(env, idVenta);

  if (!sale) {
    throw new ApiError('VENTA_NO_ENCONTRADA', 'La venta no existe.', 404);
  }

  const returns = await returnsRepository.listSaleReturns(env, idVenta);
  return returns.map(toPublicSaleReturn);
}

function mergeRequestedDetails(
  details: CreateSaleReturnInput['detalles'],
): CreateSaleReturnInput['detalles'] {
  const merged = new Map<string, number>();

  for (const detail of details) {
    merged.set(
      detail.idDetalleVenta,
      (merged.get(detail.idDetalleVenta) ?? 0) + detail.cantidadDevuelta,
    );
  }

  return Array.from(merged.entries()).map(([idDetalleVenta, cantidadDevuelta]) => ({
    idDetalleVenta,
    cantidadDevuelta,
  }));
}
