import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toOldDebtResult, toPublicCreditDetail, toPublicCreditSummary } from './credits.mapper';
import * as creditsRepository from './credits.repository';
import type {
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
