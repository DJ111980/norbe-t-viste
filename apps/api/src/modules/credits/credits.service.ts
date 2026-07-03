import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toOldDebtResult, toPublicCreditDetail, toPublicCreditSummary } from './credits.mapper';
import * as creditsRepository from './credits.repository';
import type {
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
