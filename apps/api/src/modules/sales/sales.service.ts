import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import {
  toCashSaleSummary,
  toPublicSaleDetail,
  toPublicSalePayment,
  toPublicSaleSummary,
} from './sales.mapper';
import * as salesRepository from './sales.repository';
import type {
  CancelCashSaleInput,
  CancelCashSaleResult,
  CreateCashSaleInput,
  CreateCashSaleResult,
  SaleDetailToCreate,
} from './sales.types';
import type {
  ListSalesFilters,
  PublicSaleDetail,
  PublicSalePayment,
  PublicSaleSummary,
} from './sales.types';

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createSaleNumber(): string {
  const compactDate = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `VTA-${compactDate}-${suffix}`;
}

export async function createCashSale(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateCashSaleInput,
): Promise<CreateCashSaleResult> {
  if (input.idCliente) {
    const client = await salesRepository.findClientForSale(env, input.idCliente);

    if (!client) {
      throw new ApiError('CLIENT_NOT_FOUND', 'El cliente no existe.', 404);
    }

    if (client.estado !== 'ACTIVO') {
      throw new ApiError('CLIENT_INACTIVE', 'No se puede vender a un cliente inactivo.', 400);
    }
  }

  const detalles: SaleDetailToCreate[] = [];
  let total = 0;

  for (const item of input.detalles) {
    const variant = await salesRepository.findVariantForSale(env, item.idVariante);

    if (!variant) {
      throw new ApiError('SALE_VARIANT_NOT_FOUND', 'La variante no existe.', 404);
    }

    if (variant.estado !== 'ACTIVA') {
      throw new ApiError('VARIANT_INACTIVE', 'No se puede vender una variante inactiva.', 400);
    }

    if (variant.estado_producto !== 'ACTIVO') {
      throw new ApiError('PRODUCT_INACTIVE', 'No se puede vender un producto inactivo.', 400);
    }

    if (variant.stock_actual < item.cantidad) {
      throw new ApiError('INSUFFICIENT_STOCK', 'No hay stock suficiente para la venta.', 400);
    }

    const precioUnitario = item.precioUnitario ?? variant.precio_venta;

    if (precioUnitario <= 0) {
      throw new ApiError(
        'INVALID_SALE_PRICE',
        'El precio usado para la venta debe ser mayor que 0.',
        400,
      );
    }

    const subtotal = precioUnitario * item.cantidad;
    total += subtotal;

    detalles.push({
      idDetalleVenta: createId('detven'),
      idVariante: variant.id_variante,
      codigoQr: variant.codigo_qr,
      nombreProducto: variant.nombre_producto,
      sku: variant.sku,
      talla: variant.talla,
      color: variant.color,
      cantidad: item.cantidad,
      precioUnitario,
      descuento: 0,
      subtotal,
      stockAntes: variant.stock_actual,
      stockDespues: variant.stock_actual - item.cantidad,
      idMovimiento: createId('mov'),
    });
  }

  const idVenta = createId('ven');
  const saleInput = {
    idVenta,
    numeroVenta: createSaleNumber(),
    idCliente: input.idCliente,
    idUsuario: auth.user.id_usuario,
    metodoPago: input.metodoPago,
    observaciones: input.observaciones,
    subtotal: total,
    total,
    idPagoVenta: createId('pagven'),
    detalles,
  };

  // Esta primera fase implementa solo contado: no crea credito ni abono. El
  // detalle congela precio y datos basicos para que cambios futuros del catalogo
  // no alteren el historial de la venta.
  await salesRepository.createCashSale(env, saleInput);

  const status = await salesRepository.getCashSalePersistenceStatus(env, idVenta);

  if (
    !status.saleExists ||
    !status.paymentExists ||
    status.detailsCount !== detalles.length ||
    status.movementCount !== detalles.length
  ) {
    throw new ApiError(
      'SALE_NOT_APPLIED',
      'No se pudo completar la venta de contado de forma consistente.',
      409,
    );
  }

  return toCashSaleSummary({
    id_venta: idVenta,
    numero_venta: saleInput.numeroVenta,
    tipo_venta: 'CONTADO',
    estado_venta: 'COMPLETADA',
    total,
    saldo_pendiente: 0,
    items_vendidos: detalles.reduce((sum, detail) => sum + detail.cantidad, 0),
    movimientos_creados: detalles.length,
    pago: {
      metodo_pago: input.metodoPago,
      valor_pagado: total,
    },
  });
}

export async function listSales(
  env: ApiEnv,
  _auth: AuthContext,
  filters: ListSalesFilters,
): Promise<PublicSaleSummary[]> {
  // Consulta pura: listar ventas no debe tocar stock, movimientos, pagos ni cartera.
  // La anulacion tendra su propia fase para revertir stock y auditar cambios.
  const sales = await salesRepository.listSales(env, filters);

  return sales.map(toPublicSaleSummary);
}

export async function getSaleById(
  env: ApiEnv,
  _auth: AuthContext,
  idVenta: string,
): Promise<PublicSaleDetail> {
  const sale = await salesRepository.getSaleDetailView(env, idVenta);

  if (!sale) {
    throw new ApiError('SALE_NOT_FOUND', 'La venta no existe.', 404);
  }

  return toPublicSaleDetail(sale);
}

export async function listSalePayments(
  env: ApiEnv,
  _auth: AuthContext,
  idVenta: string,
): Promise<PublicSalePayment[]> {
  const sale = await salesRepository.findSaleById(env, idVenta);

  if (!sale) {
    throw new ApiError('SALE_NOT_FOUND', 'La venta no existe.', 404);
  }

  // Los pagos se consultan sin modificarlos. Anular pagos pertenece a la fase
  // de anulacion de venta, no a estas rutas de lectura.
  const payments = await salesRepository.listSalePayments(env, idVenta);

  return payments.map(toPublicSalePayment);
}

export async function cancelCashSale(
  env: ApiEnv,
  auth: AuthContext,
  idVenta: string,
  input: CancelCashSaleInput,
): Promise<CancelCashSaleResult> {
  const sale = await salesRepository.findSaleById(env, idVenta);

  if (!sale) {
    throw new ApiError('SALE_NOT_FOUND', 'La venta no existe.', 404);
  }

  if (sale.tipo_venta !== 'CONTADO') {
    throw new ApiError(
      'ONLY_CASH_SALE_CANCELLATION_ALLOWED',
      'Por ahora solo se permite anular ventas de contado.',
      400,
    );
  }

  if (sale.estado_venta === 'ANULADA') {
    throw new ApiError('SALE_ALREADY_CANCELLED', 'La venta ya esta anulada.', 400);
  }

  if (sale.estado_venta !== 'COMPLETADA') {
    throw new ApiError('SALE_NOT_COMPLETED', 'Solo se pueden anular ventas completadas.', 400);
  }

  const detalles = await salesRepository.listSaleDetails(env, idVenta);

  if (detalles.length === 0) {
    throw new ApiError('SALE_DETAILS_NOT_FOUND', 'La venta no tiene detalles para anular.', 409);
  }

  const movimientos = [];
  let totalUnidadesDevuelto = 0;

  for (const detail of detalles) {
    const variant = await salesRepository.findVariantStockById(env, detail.id_variante);

    if (!variant) {
      throw new ApiError(
        'SALE_VARIANT_NOT_FOUND',
        'No se encontro una variante asociada al detalle de venta.',
        409,
      );
    }

    totalUnidadesDevuelto += detail.cantidad;
    movimientos.push({
      idMovimiento: createId('mov'),
      idVariante: detail.id_variante,
      cantidad: detail.cantidad,
      stockAntes: variant.stock_actual,
      stockDespues: variant.stock_actual + detail.cantidad,
    });
  }

  const pagosActivos = (await salesRepository.listSalePayments(env, idVenta)).filter(
    (payment) => payment.estado_pago === 'ACTIVO',
  ).length;

  // Solo se anula contado en esta fase: credito y mixta afectan cartera, abonos
  // y saldos. Al anular contado se devuelve stock completo y cada devolucion
  // queda auditada como movimiento ANULACION_VENTA.
  await salesRepository.cancelCashSale(env, {
    idVenta,
    idUsuario: auth.user.id_usuario,
    motivoAnulacion: input.motivoAnulacion,
    movimientos,
  });

  const status = await salesRepository.getCancellationPersistenceStatus(env, idVenta);

  if (
    !status.saleCancelled ||
    status.activePaymentsCount !== 0 ||
    status.cancellationMovementCount !== movimientos.length
  ) {
    throw new ApiError(
      'SALE_CANCELLATION_NOT_APPLIED',
      'No se pudo anular la venta de forma consistente.',
      409,
    );
  }

  return {
    id_venta: idVenta,
    estado_venta: 'ANULADA',
    items_revertidos: detalles.length,
    movimientos_creados: movimientos.length,
    pagos_anulados: status.cancelledPaymentsCount || pagosActivos,
    total_unidades_devuelto: totalUnidadesDevuelto,
  };
}
