import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicSaleReturn } from './returns.mapper';
import * as returnsRepository from './returns.repository';
import type {
  CreateSaleReturnInput,
  CreateSaleReturnResult,
  PublicSaleReturn,
  ReturnCreditRecord,
  SaleReturnDetailToCreate,
} from './returns.types';
import type { SaleType } from '../sales/sales.types';

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

    const precioUnitarioNeto = Math.round(saleDetail.subtotal / saleDetail.cantidad);

    detailsToCreate.push({
      idDetalleDevolucion: createId('devdet'),
      idDetalleVenta: saleDetail.id_detalle_venta,
      idVariante: saleDetail.id_variante,
      cantidadDevuelta: requestedDetail.cantidadDevuelta,
      precioUnitario: precioUnitarioNeto,
      subtotalDevuelto: requestedDetail.cantidadDevuelta * precioUnitarioNeto,
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
  const creditUpdate =
    sale.tipo_venta === 'CREDITO' || sale.tipo_venta === 'MIXTA'
      ? await buildCreditReturnUpdate(env, idVenta, sale.tipo_venta, totalDevuelto)
      : undefined;

  await returnsRepository.createSaleReturn(env, {
    idDevolucion,
    idVenta,
    tipoVenta: sale.tipo_venta,
    motivo: input.motivo,
    totalDevuelto,
    impactoCredito: sale.tipo_venta === 'CONTADO' ? 0 : totalDevuelto,
    impactoPago: sale.tipo_venta === 'CONTADO' ? totalDevuelto : 0,
    creadoPor: auth.user.id_usuario,
    detalles: detailsToCreate,
    creditUpdate,
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
    persistence.creditAdjustmentCount !== sideEffectsBefore.creditAdjustmentCount ||
    (creditUpdate &&
      (persistence.creditSaldoPendiente !== creditUpdate.saldoDespues ||
        persistence.creditMontoAbonado !== creditUpdate.montoAbonado ||
        persistence.creditEstado !== creditUpdate.estadoCredito))
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
    tipo_venta: sale.tipo_venta,
    estado_devolucion: 'ACTIVA',
    total_devuelto: totalDevuelto,
    impacto_credito: sale.tipo_venta === 'CONTADO' ? 0 : totalDevuelto,
    impacto_pago: sale.tipo_venta === 'CONTADO' ? totalDevuelto : 0,
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

async function buildCreditReturnUpdate(
  env: ApiEnv,
  idVenta: string,
  tipoVenta: Extract<SaleType, 'CREDITO' | 'MIXTA'>,
  totalDevuelto: number,
): Promise<NonNullable<Parameters<typeof returnsRepository.createSaleReturn>[1]['creditUpdate']>> {
  const credits = await returnsRepository.listCreditsForReturn(env, idVenta);

  if (credits.length === 0) {
    throw new ApiError(
      'CREDITO_ASOCIADO_NO_ENCONTRADO',
      'La venta a credito no tiene un credito asociado.',
      400,
    );
  }

  if (credits.length > 1) {
    throw new ApiError(
      'CREDITO_ASOCIADO_INCONSISTENTE',
      'La venta a credito tiene mas de un credito asociado.',
      409,
    );
  }

  const credit = credits[0] as ReturnCreditRecord;

  if (credit.origen_credito !== 'VENTA') {
    throw new ApiError(
      'CREDITO_ASOCIADO_INCONSISTENTE',
      'El credito asociado no corresponde a una venta.',
      409,
    );
  }

  if (credit.estado_credito === 'ANULADO') {
    throw new ApiError(
      'CREDITO_ANULADO_NO_DEVOLUBLE',
      'No se puede devolver automaticamente una venta con credito anulado.',
      400,
    );
  }

  const activity = await returnsRepository.countCreditActivityForReturn(env, credit.id_credito);

  if (activity.paymentsCount > 0) {
    throw new ApiError(
      'CREDITO_CON_ABONOS_NO_DEVOLUBLE',
      'No se puede devolver automaticamente una venta a credito con abonos.',
      400,
    );
  }

  if (activity.adjustmentsCount > 0) {
    throw new ApiError(
      'CREDITO_CON_AJUSTES_NO_DEVOLUBLE',
      'No se puede devolver automaticamente una venta a credito con ajustes.',
      400,
    );
  }

  if (totalDevuelto > credit.saldo_pendiente) {
    const code =
      tipoVenta === 'MIXTA'
        ? 'DEVOLUCION_MIXTA_EXCEDE_SALDO_CREDITO'
        : 'DEVOLUCION_EXCEDE_SALDO_CREDITO';

    throw new ApiError(code, 'El valor devuelto excede el saldo pendiente del credito.', 400);
  }

  const saldoDespues = credit.saldo_pendiente - totalDevuelto;

  return {
    idCredito: credit.id_credito,
    saldoAntes: credit.saldo_pendiente,
    saldoDespues,
    montoAbonado: credit.monto_abonado,
    estadoCredito: resolveCreditStatusAfterReturn(saldoDespues, credit.monto_abonado),
  };
}

function resolveCreditStatusAfterReturn(
  saldoDespues: number,
  montoAbonado: number,
): ReturnCreditRecord['estado_credito'] {
  if (saldoDespues === 0) return 'PAGADO';
  return montoAbonado > 0 ? 'PARCIAL' : 'PENDIENTE';
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
