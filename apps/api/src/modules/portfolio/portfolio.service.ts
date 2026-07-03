import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import {
  toPublicClientPortfolio,
  toPublicPortfolioCredit,
  toPublicPortfolioSummary,
} from './portfolio.mapper';
import * as portfolioRepository from './portfolio.repository';
import type { PortfolioFilters, PublicClientPortfolio, PublicPortfolio } from './portfolio.types';

export async function getPortfolio(
  env: ApiEnv,
  filters: PortfolioFilters,
): Promise<PublicPortfolio> {
  // Cartera general es solo lectura: no crea creditos, abonos, ajustes ni mueve
  // inventario. Sirve para observar saldos ya calculados por creditos_clientes.
  const [summary, credits] = await Promise.all([
    portfolioRepository.getPortfolioSummary(env, filters),
    portfolioRepository.listPortfolioCredits(env, filters),
  ]);

  return {
    resumen: toPublicPortfolioSummary(summary),
    creditos: credits.map(toPublicPortfolioCredit),
    paginacion: {
      limit: filters.limit,
      offset: filters.offset,
    },
  };
}

export async function getClientPortfolio(
  env: ApiEnv,
  idCliente: string,
): Promise<PublicClientPortfolio> {
  const client = await portfolioRepository.findClient(env, idCliente);

  if (!client) {
    throw new ApiError('CLIENT_NOT_FOUND', 'El cliente no existe.', 404);
  }

  // VENDEDOR puede ver la cartera puntual de un cliente para cobrar o atender,
  // pero no la cartera general del negocio completa.
  const [credits, lastPayment] = await Promise.all([
    portfolioRepository.listClientPortfolioCredits(env, idCliente),
    portfolioRepository.findLastClientPayment(env, idCliente),
  ]);

  return toPublicClientPortfolio(client, credits, lastPayment);
}
