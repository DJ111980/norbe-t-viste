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
  CancelSaleInput,
  CancelSaleResult,
  CreateCashSaleInput,
  CreateCashSaleResult,
  CreateCreditSaleRepositoryInput,
  CreateCreditSaleResult,
  CreateMixedSaleResult,
  CreateSaleInput,
  CreateSaleResult,
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
  return createSale(env, auth, input) as Promise<CreateCashSaleResult>;
}

async function buildSaleDetails(
  env: ApiEnv,
  input: CreateSaleInput,
): Promise<{ detalles: SaleDetailToCreate[]; total: number }> {
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

  return { detalles, total };
}

export async function createSale(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateSaleInput,
): Promise<CreateSaleResult> {
  if (input.idCliente) {
    const client = await salesRepository.findClientForSale(env, input.idCliente);

    if (!client) {
      throw new ApiError('CLIENT_NOT_FOUND', 'El cliente no existe.', 404);
    }

    if (client.estado !== 'ACTIVO') {
      throw new ApiError('CLIENT_INACTIVE', 'No se puede vender a un cliente inactivo.', 400);
    }
  } else if (input.tipoVenta === 'CREDITO' || input.tipoVenta === 'MIXTA') {
    throw new ApiError(
      input.tipoVenta === 'CREDITO' ? 'CREDIT_SALE_CLIENT_REQUIRED' : 'MIXED_SALE_CLIENT_REQUIRED',
      input.tipoVenta === 'CREDITO'
        ? 'El cliente es obligatorio para una venta a credito.'
        : 'El cliente es obligatorio para una venta mixta.',
      400,
    );
  }

  const { detalles, total } = await buildSaleDetails(env, input);

  const idVenta = createId('ven');
  const saleInput = {
    idVenta,
    numeroVenta: createSaleNumber(),
    idCliente: input.idCliente,
    idUsuario: auth.user.id_usuario,
    observaciones: input.observaciones,
    subtotal: total,
    total,
    detalles,
  };

  if (input.tipoVenta === 'CREDITO') {
    return createCreditSaleFromPreparedInput(env, {
      ...saleInput,
      idCliente: input.idCliente,
    });
  }

  if (input.tipoVenta === 'MIXTA') {
    if (input.valorPagadoInicial >= total) {
      throw new ApiError(
        'MIXED_SALE_INITIAL_PAYMENT_MUST_BE_LESS_THAN_TOTAL',
        'El pago inicial debe ser menor que el total. Si paga todo, usa venta de contado.',
        400,
      );
    }

    return createMixedSaleFromPreparedInput(env, {
      ...saleInput,
      idPagoVenta: createId('pagven'),
      idCredito: createId('cre'),
      idCliente: input.idCliente,
      metodoPago: input.metodoPago,
      valorPagadoInicial: input.valorPagadoInicial,
      saldoCredito: total - input.valorPagadoInicial,
    });
  }

  // Esta primera fase implementa solo contado: no crea credito ni abono. El
  // detalle congela precio y datos basicos para que cambios futuros del catalogo
  // no alteren el historial de la venta.
  await salesRepository.createCashSale(env, {
    ...saleInput,
    metodoPago: input.metodoPago,
    idPagoVenta: createId('pagven'),
  });

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

async function createMixedSaleFromPreparedInput(
  env: ApiEnv,
  saleInput: Parameters<typeof salesRepository.createMixedSale>[1],
): Promise<CreateMixedSaleResult> {
  // MIXTA descuenta stock completo porque la mercancia sale de la tienda en el
  // momento de la venta. El pago inicial se registra en pagos_ventas; no es un
  // abono al credito, ya que el credito nace solo por el saldo restante.
  await salesRepository.createMixedSale(env, saleInput);

  const status = await salesRepository.getMixedSalePersistenceStatus(
    env,
    saleInput.idVenta,
    saleInput.idCredito,
    saleInput.detalles.map((detail) => ({
      idVariante: detail.idVariante,
      stockDespues: detail.stockDespues,
    })),
  );

  if (
    !status.saleExists ||
    status.paymentCount !== 1 ||
    !status.creditExists ||
    status.creditInitialAmount !== saleInput.saldoCredito ||
    status.creditPaidAmount !== 0 ||
    status.creditBalance !== saleInput.saldoCredito ||
    status.creditStatus !== 'PENDIENTE' ||
    status.creditPaymentExists ||
    status.creditAdjustmentExists ||
    status.detailsCount !== saleInput.detalles.length ||
    status.creditDetailsCount !== saleInput.detalles.length ||
    status.movementCount !== saleInput.detalles.length ||
    status.stockMatchesCount !== saleInput.detalles.length
  ) {
    throw new ApiError(
      'MIXED_SALE_NOT_APPLIED',
      'No se pudo completar la venta mixta de forma consistente.',
      409,
    );
  }

  return {
    id_venta: saleInput.idVenta,
    numero_venta: saleInput.numeroVenta,
    tipo_venta: 'MIXTA',
    estado_venta: 'COMPLETADA',
    total: saleInput.total,
    valor_pagado_inicial: saleInput.valorPagadoInicial,
    saldo_pendiente: saleInput.saldoCredito,
    id_pago: saleInput.idPagoVenta,
    id_credito: saleInput.idCredito,
    estado_credito: 'PENDIENTE',
    items_vendidos: saleInput.detalles.reduce((sum, detail) => sum + detail.cantidad, 0),
    movimientos_creados: saleInput.detalles.length,
  };
}

async function createCreditSaleFromPreparedInput(
  env: ApiEnv,
  saleInput: Omit<CreateCreditSaleRepositoryInput, 'idCredito'>,
): Promise<CreateCreditSaleResult> {
  const idCredito = createId('cre');

  // La venta a credito crea credito porque el producto sale hoy, pero el dinero
  // queda pendiente. No crea pago_venta ni abono: los cobros se registran luego
  // desde cartera. MIXTA y anulacion con credito quedan para fases posteriores
  // porque combinan pagos iniciales, saldos y reversos de inventario/cartera.
  await salesRepository.createCreditSale(env, {
    ...saleInput,
    idCredito,
  });

  const status = await salesRepository.getCreditSalePersistenceStatus(
    env,
    saleInput.idVenta,
    idCredito,
    saleInput.detalles.map((detail) => ({
      idVariante: detail.idVariante,
      stockDespues: detail.stockDespues,
    })),
  );

  if (
    !status.saleExists ||
    !status.creditExists ||
    status.paymentExists ||
    status.creditPaymentExists ||
    status.creditAdjustmentExists ||
    status.detailsCount !== saleInput.detalles.length ||
    status.creditDetailsCount !== saleInput.detalles.length ||
    status.movementCount !== saleInput.detalles.length ||
    status.stockMatchesCount !== saleInput.detalles.length
  ) {
    throw new ApiError(
      'CREDIT_SALE_NOT_APPLIED',
      'No se pudo completar la venta a credito de forma consistente.',
      409,
    );
  }

  return {
    id_venta: saleInput.idVenta,
    numero_venta: saleInput.numeroVenta,
    tipo_venta: 'CREDITO',
    estado_venta: 'COMPLETADA',
    total: saleInput.total,
    saldo_pendiente: saleInput.total,
    id_credito: idCredito,
    estado_credito: 'PENDIENTE',
    items_vendidos: saleInput.detalles.reduce((sum, detail) => sum + detail.cantidad, 0),
    movimientos_creados: saleInput.detalles.length,
  };
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

export async function cancelSale(
  env: ApiEnv,
  auth: AuthContext,
  idVenta: string,
  input: CancelSaleInput,
): Promise<CancelSaleResult> {
  const sale = await salesRepository.findSaleById(env, idVenta);

  if (!sale) {
    throw new ApiError('SALE_NOT_FOUND', 'La venta no existe.', 404);
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

  const pagos = await salesRepository.listSalePayments(env, idVenta);
  const pagosActivos = pagos.filter((payment) => payment.estado_pago === 'ACTIVO').length;
  let idCredito: string | undefined;

  if (sale.tipo_venta === 'CREDITO' || sale.tipo_venta === 'MIXTA') {
    const creditos = await salesRepository.listSaleCredits(env, idVenta);

    if (creditos.length === 0) {
      throw new ApiError(
        'SALE_CREDIT_NOT_FOUND',
        'No existe un credito asociado a la venta para anular.',
        409,
      );
    }

    if (creditos.length > 1) {
      throw new ApiError(
        'SALE_CREDIT_INCONSISTENT',
        'La venta tiene mas de un credito asociado y requiere revision manual.',
        409,
      );
    }

    const credito = creditos[0];

    if (!credito || credito.origen_credito !== 'VENTA' || credito.id_venta !== idVenta) {
      throw new ApiError(
        'SALE_CREDIT_INCONSISTENT',
        'El credito asociado a la venta no es consistente.',
        409,
      );
    }

    if (credito.estado_credito === 'ANULADO') {
      throw new ApiError('SALE_CREDIT_ALREADY_CANCELLED', 'El credito ya esta anulado.', 400);
    }

    if (
      credito.estado_credito !== 'PENDIENTE' ||
      credito.monto_abonado !== 0 ||
      credito.saldo_pendiente !== credito.monto_inicial
    ) {
      throw new ApiError(
        'VENTA_CON_CREDITO_MODIFICADO',
        'No se puede anular automaticamente una venta con credito que ya tiene abonos o ajustes. Requiere manejo manual por administracion.',
        409,
      );
    }

    const tieneAbonos = await salesRepository.creditHasPayments(env, credito.id_credito);
    const tieneAjustes = await salesRepository.creditHasAdjustments(env, credito.id_credito);

    // Si la cartera ya tuvo abonos o ajustes, el sistema no debe inventar el
    // reverso de dinero recibido, descuentos o correcciones administrativas.
    if (tieneAbonos || tieneAjustes) {
      throw new ApiError(
        'VENTA_CON_CREDITO_MODIFICADO',
        'No se puede anular automaticamente una venta con credito que ya tiene abonos o ajustes. Requiere manejo manual por administracion.',
        409,
      );
    }

    if (sale.tipo_venta === 'CREDITO' && pagos.length > 0) {
      throw new ApiError(
        'SALE_CREDIT_INCONSISTENT',
        'La venta a credito no debe tener pagos de venta asociados.',
        409,
      );
    }

    if (sale.tipo_venta === 'MIXTA') {
      if (pagosActivos !== 1) {
        throw new ApiError(
          'SALE_MIXED_INITIAL_PAYMENT_NOT_FOUND',
          'La venta mixta debe tener exactamente un pago inicial activo para anular.',
          409,
        );
      }

      const pagoInicial = pagos.find((payment) => payment.estado_pago === 'ACTIVO');

      if (!pagoInicial || pagoInicial.valor_pagado !== sale.valor_pagado_inicial) {
        throw new ApiError(
          'SALE_CREDIT_INCONSISTENT',
          'El pago inicial de la venta mixta no coincide con la venta.',
          409,
        );
      }
    }

    idCredito = credito.id_credito;
  }

  // Esta fase devuelve siempre la venta completa. Las devoluciones parciales
  // quedan fuera porque requieren otro modelo de detalle, saldos y auditoria.
  await salesRepository.cancelSale(env, {
    idVenta,
    tipoVenta: sale.tipo_venta,
    idUsuario: auth.user.id_usuario,
    motivoAnulacion: input.motivoAnulacion,
    movimientos,
    idCredito,
  });

  const status = await salesRepository.getCancellationPersistenceStatus(
    env,
    idVenta,
    sale.tipo_venta,
    movimientos.map((movement) => ({
      idVariante: movement.idVariante,
      stockDespues: movement.stockDespues,
    })),
    idCredito,
  );

  const expectedActivePayments = sale.tipo_venta === 'CREDITO' ? 0 : 0;

  if (
    !status.saleCancelled ||
    status.activePaymentsCount !== expectedActivePayments ||
    status.cancellationMovementCount !== movimientos.length ||
    status.stockMatchesCount !== movimientos.length ||
    (sale.tipo_venta !== 'CONTADO' &&
      (!status.creditCancelled ||
        status.creditBalance !== 0 ||
        status.creditPaymentExists ||
        status.creditAdjustmentExists))
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
    id_credito: idCredito,
    credito_anulado: sale.tipo_venta === 'CONTADO' ? undefined : true,
    total_unidades_devuelto: totalUnidadesDevuelto,
  };
}
