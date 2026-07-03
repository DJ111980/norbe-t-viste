import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toOldDebtResult, toPublicCreditDetail, toPublicCreditSummary } from './credits.mapper';
import * as creditsRepository from './credits.repository';
import type {
  CreateCreditAdjustmentInput,
  CreateCreditAdjustmentResult,
  CreateCreditPaymentInput,
  CreateCreditPaymentResult,
  CreateOldDebtInput,
  CreateOldDebtResult,
  ListClientCreditsFilters,
  ListCreditsFilters,
  PublicCreditDetail,
  PublicCreditSummary,
} from './credits.types';

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function resolveCreditStatusAfterBalance(
  saldoDespues: number,
  montoAbonado: number,
): Extract<CreateCreditAdjustmentResult['estado_credito'], 'PENDIENTE' | 'PARCIAL' | 'PAGADO'> {
  if (saldoDespues === 0) return 'PAGADO';
  return montoAbonado > 0 ? 'PARCIAL' : 'PENDIENTE';
}

export async function listCredits(
  env: ApiEnv,
  filters: ListCreditsFilters,
): Promise<PublicCreditSummary[]> {
  const credits = await creditsRepository.listCredits(env, filters);

  return credits.map(toPublicCreditSummary);
}

export async function getCreditById(env: ApiEnv, idCredito: string): Promise<PublicCreditDetail> {
  const credit = await creditsRepository.getCreditDetailView(env, idCredito);

  if (!credit) {
    throw new ApiError('CREDIT_NOT_FOUND', 'El credito no existe.', 404);
  }

  return toPublicCreditDetail(credit);
}

export async function listClientCredits(
  env: ApiEnv,
  idCliente: string,
  filters: ListClientCreditsFilters,
): Promise<PublicCreditSummary[]> {
  const client = await creditsRepository.findClientForCredit(env, idCliente);

  if (!client) {
    throw new ApiError('CLIENT_NOT_FOUND', 'El cliente no existe.', 404);
  }

  const credits = await creditsRepository.listCreditsByClient(env, idCliente, filters);

  return credits.map(toPublicCreditSummary);
}

export async function createOldDebt(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateOldDebtInput,
): Promise<CreateOldDebtResult> {
  const client = await creditsRepository.findClientForCredit(env, input.idCliente);

  if (!client) {
    throw new ApiError('CLIENT_NOT_FOUND', 'El cliente no existe.', 404);
  }

  if (client.estado !== 'ACTIVO') {
    throw new ApiError(
      'CLIENT_INACTIVE',
      'No se puede registrar deuda a un cliente inactivo.',
      400,
    );
  }

  // Las deudas antiguas nacen como credito directo del cliente: no crean venta,
  // pago, abono, ajuste ni movimiento de inventario. Abonos y ajustes llegan en
  // fases posteriores para mantener la cartera revisable paso a paso.
  const credit = await creditsRepository.createOldDebtCredit(
    env,
    createId('cre'),
    input,
    auth.user.id_usuario,
  );

  return toOldDebtResult(credit);
}

export async function createCreditPayment(
  env: ApiEnv,
  auth: AuthContext,
  idCredito: string,
  input: CreateCreditPaymentInput,
): Promise<CreateCreditPaymentResult> {
  const credit = await creditsRepository.findCreditById(env, idCredito);

  if (!credit) {
    throw new ApiError('CREDIT_NOT_FOUND', 'El credito no existe.', 404);
  }

  if (credit.estado_credito === 'ANULADO') {
    throw new ApiError('CREDIT_CANCELLED', 'No se puede abonar a un credito anulado.', 400);
  }

  if (credit.estado_credito === 'PAGADO' || credit.saldo_pendiente <= 0) {
    throw new ApiError('CREDIT_ALREADY_PAID', 'El credito ya esta pagado.', 400);
  }

  if (input.valorAbono > credit.saldo_pendiente) {
    throw new ApiError(
      'CREDIT_PAYMENT_EXCEEDS_BALANCE',
      'El abono no puede ser mayor que el saldo pendiente.',
      400,
    );
  }

  const saldoNuevo = credit.saldo_pendiente - input.valorAbono;
  const estadoCredito = saldoNuevo === 0 ? 'PAGADO' : 'PARCIAL';
  const idAbono = createId('abo');

  // Un VENDEDOR puede registrar abonos, pero el credito mantiene auditoria del
  // usuario que hizo la operacion. Este flujo solo toca cartera: no crea ventas,
  // no registra pagos de venta y no mueve inventario.
  await creditsRepository.createCreditPayment(env, {
    ...input,
    idAbono,
    idCredito,
    idCliente: credit.id_cliente,
    idUsuario: auth.user.id_usuario,
    saldoNuevo,
    estadoCredito,
  });

  const persistence = await creditsRepository.getCreditPaymentPersistenceStatus(
    env,
    idCredito,
    idAbono,
  );

  if (
    !persistence.paymentExists ||
    persistence.creditSaldoPendiente !== saldoNuevo ||
    persistence.creditMontoAbonado !== credit.monto_abonado + input.valorAbono ||
    persistence.creditEstado !== estadoCredito
  ) {
    throw new ApiError(
      'CREDIT_PAYMENT_NOT_APPLIED',
      'No se pudo registrar el abono del credito.',
      409,
    );
  }

  return {
    id_credito: idCredito,
    id_abono: idAbono,
    valor_abono: input.valorAbono,
    saldo_anterior: credit.saldo_pendiente,
    saldo_nuevo: saldoNuevo,
    estado_credito: estadoCredito,
  };
}

export async function createCreditAdjustment(
  env: ApiEnv,
  auth: AuthContext,
  idCredito: string,
  input: CreateCreditAdjustmentInput,
): Promise<CreateCreditAdjustmentResult> {
  const credit = await creditsRepository.findCreditById(env, idCredito);

  if (!credit) {
    throw new ApiError('CREDIT_NOT_FOUND', 'El credito no existe.', 404);
  }

  if (credit.estado_credito === 'ANULADO') {
    throw new ApiError('CREDIT_CANCELLED', 'No se puede ajustar un credito anulado.', 400);
  }

  let saldoDespues: number;
  let valorAjuste: number;

  if (input.tipoAjuste === 'AUMENTO') {
    valorAjuste = input.valorAjuste as number;
    saldoDespues = credit.saldo_pendiente + valorAjuste;
  } else if (input.tipoAjuste === 'DESCUENTO') {
    valorAjuste = input.valorAjuste as number;

    if (valorAjuste > credit.saldo_pendiente) {
      throw new ApiError(
        'CREDIT_ADJUSTMENT_EXCEEDS_BALANCE',
        'El descuento no puede ser mayor que el saldo pendiente.',
        400,
      );
    }

    saldoDespues = credit.saldo_pendiente - valorAjuste;
  } else {
    saldoDespues = input.saldoFinal as number;
    // En CORRECCION se guarda la diferencia absoluta: el tipo de ajuste explica
    // que no es un abono ni un descuento comercial, y el valor conserva la
    // magnitud del cambio para auditoria sin introducir montos negativos.
    valorAjuste = Math.abs(saldoDespues - credit.saldo_pendiente);
  }

  if (saldoDespues < 0) {
    throw new ApiError('NEGATIVE_CREDIT_BALANCE', 'El ajuste no puede dejar saldo negativo.', 400);
  }

  const estadoCredito = resolveCreditStatusAfterBalance(saldoDespues, credit.monto_abonado);
  const idAjuste = createId('aju');

  // Solo ADMINISTRADOR puede crear ajustes porque cambian el saldo sin dinero
  // recibido. Ventas a credito y mixtas quedan para una fase posterior; aqui no
  // se crean ventas, pagos de venta, abonos ni movimientos de inventario.
  await creditsRepository.createCreditAdjustment(env, {
    idAjuste,
    idCredito,
    idUsuario: auth.user.id_usuario,
    tipoAjuste: input.tipoAjuste,
    valorAjuste,
    saldoAntes: credit.saldo_pendiente,
    saldoDespues,
    motivo: input.motivo,
    montoAbonadoActual: credit.monto_abonado,
    estadoCredito,
  });

  const persistence = await creditsRepository.getCreditAdjustmentPersistenceStatus(
    env,
    idCredito,
    idAjuste,
  );

  if (
    !persistence.adjustmentExists ||
    persistence.creditSaldoPendiente !== saldoDespues ||
    persistence.creditMontoAbonado !== credit.monto_abonado ||
    persistence.creditEstado !== estadoCredito
  ) {
    throw new ApiError(
      'CREDIT_ADJUSTMENT_NOT_APPLIED',
      'No se pudo registrar el ajuste del credito.',
      409,
    );
  }

  return {
    id_credito: idCredito,
    id_ajuste: idAjuste,
    tipo_ajuste: input.tipoAjuste,
    valor_ajuste: valorAjuste,
    saldo_antes: credit.saldo_pendiente,
    saldo_despues: saldoDespues,
    estado_credito: estadoCredito,
  };
}
