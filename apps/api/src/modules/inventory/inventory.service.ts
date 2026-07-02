import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicInventoryMovement, toPublicInventoryVariant } from './inventory.mapper';
import * as inventoryRepository from './inventory.repository';
import type {
  ListInventoryMovementsFilters,
  ListInventoryVariantsFilters,
  PublicInventoryMovement,
  PublicInventoryVariant,
} from './inventory.types';

function onlyVisibleToSeller(auth: AuthContext): boolean {
  // El vendedor consulta disponibilidad para vender. Por ahora no ve productos o
  // variantes inactivas ni historial de movimientos.
  return auth.user.rol === 'VENDEDOR';
}

export async function listInventoryVariants(
  env: ApiEnv,
  auth: AuthContext,
  filters: ListInventoryVariantsFilters,
): Promise<PublicInventoryVariant[]> {
  const variants = await inventoryRepository.listInventoryVariants(
    env,
    filters,
    onlyVisibleToSeller(auth),
  );

  return variants.map((variant) => toPublicInventoryVariant(variant, { role: auth.user.rol }));
}

export async function getInventoryVariant(
  env: ApiEnv,
  auth: AuthContext,
  idVariante: string,
): Promise<PublicInventoryVariant> {
  const variant = await inventoryRepository.findInventoryVariantById(
    env,
    idVariante,
    onlyVisibleToSeller(auth),
  );

  if (!variant) {
    throw new ApiError('INVENTORY_VARIANT_NOT_FOUND', 'La variante no esta disponible.', 404);
  }

  return toPublicInventoryVariant(variant, { role: auth.user.rol });
}

export async function listInventoryMovements(
  env: ApiEnv,
  filters: ListInventoryMovementsFilters,
): Promise<PublicInventoryMovement[]> {
  // Consulta pura: no confirma lotes, no modifica stock y no crea movimientos.
  const movements = await inventoryRepository.listInventoryMovements(env, filters);

  return movements.map(toPublicInventoryMovement);
}
