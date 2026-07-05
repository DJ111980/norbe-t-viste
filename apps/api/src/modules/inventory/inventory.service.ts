import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicInventoryMovement, toPublicInventoryVariant } from './inventory.mapper';
import * as inventoryRepository from './inventory.repository';
import type {
  ListInventoryMovementsFilters,
  ListInventoryVariantsFilters,
  ManualInventoryAdjustmentInput,
  ManualInventoryAdjustmentResult,
  PublicInventoryMovement,
  PublicInventoryVariant,
  RegisterInitialInventoryInput,
  RegisterInitialInventoryResult,
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

  return variants.map((variant) => toPublicInventoryVariant(variant));
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

  return toPublicInventoryVariant(variant);
}

export async function listInventoryMovements(
  env: ApiEnv,
  filters: ListInventoryMovementsFilters,
): Promise<PublicInventoryMovement[]> {
  // Consulta pura: no confirma lotes, no modifica stock y no crea movimientos.
  const movements = await inventoryRepository.listInventoryMovements(env, filters);

  return movements.map(toPublicInventoryMovement);
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function registerInitialInventory(
  env: ApiEnv,
  auth: AuthContext,
  input: RegisterInitialInventoryInput,
): Promise<RegisterInitialInventoryResult> {
  const movements = [];
  let totalUnits = 0;

  for (const item of input.items) {
    const variant = await inventoryRepository.findInventoryVariantById(env, item.idVariante, false);

    if (!variant) {
      throw new ApiError('INVENTORY_VARIANT_NOT_FOUND', 'La variante no existe.', 404);
    }

    if (variant.estado !== 'ACTIVA') {
      throw new ApiError(
        'VARIANT_INACTIVE',
        'No se puede registrar inventario inicial sobre una variante inactiva.',
        400,
      );
    }

    if (variant.estado_producto !== 'ACTIVO') {
      throw new ApiError(
        'PRODUCT_INACTIVE',
        'No se puede registrar inventario inicial sobre un producto inactivo.',
        400,
      );
    }

    if (variant.stock_actual > 0) {
      throw new ApiError(
        'INITIAL_INVENTORY_ALREADY_HAS_STOCK',
        'La variante ya tiene stock; usa ajustes de inventario en una fase posterior.',
        400,
      );
    }

    const previousMovements = await inventoryRepository.countMovementsByVariant(
      env,
      item.idVariante,
    );

    if (previousMovements > 0) {
      throw new ApiError(
        'INITIAL_INVENTORY_ALREADY_HAS_HISTORY',
        'La variante ya tiene historial; usa ajustes de inventario en una fase posterior.',
        400,
      );
    }

    totalUnits += item.cantidadInicial;
    movements.push({
      idMovimiento: createId('mov'),
      idVariante: item.idVariante,
      cantidad: item.cantidadInicial,
      stockAntes: variant.stock_actual,
      stockDespues: variant.stock_actual + item.cantidadInicial,
      motivo: item.motivo,
    });
  }

  // Inventario inicial solo se permite antes de que exista stock o historial.
  // No sirve para corregir inventario ya movido: eso vendra con ajustes manuales.
  // Producto base no maneja stock; cada cambio queda en la variante y genera movimiento.
  await inventoryRepository.registerInitialInventory(env, auth.user.id_usuario, movements);

  return {
    items_procesados: input.items.length,
    movimientos_creados: movements.length,
    total_unidades_ingresadas: totalUnits,
  };
}

export async function registerManualInventoryAdjustment(
  env: ApiEnv,
  auth: AuthContext,
  input: ManualInventoryAdjustmentInput,
): Promise<ManualInventoryAdjustmentResult> {
  const variant = await inventoryRepository.findInventoryVariantById(env, input.idVariante, false);

  if (!variant) {
    throw new ApiError('INVENTORY_VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  if (variant.estado !== 'ACTIVA') {
    throw new ApiError(
      'VARIANT_INACTIVE',
      'No se puede ajustar inventario sobre una variante inactiva.',
      400,
    );
  }

  if (variant.estado_producto !== 'ACTIVO') {
    throw new ApiError(
      'PRODUCT_INACTIVE',
      'No se puede ajustar inventario sobre un producto inactivo.',
      400,
    );
  }

  const stockAntes = variant.stock_actual;
  const stockDespues =
    input.tipoAjuste === 'AJUSTE_POSITIVO'
      ? stockAntes + input.cantidad
      : stockAntes - input.cantidad;

  if (stockDespues < 0) {
    throw new ApiError(
      'NEGATIVE_STOCK_NOT_ALLOWED',
      'El ajuste negativo no puede dejar stock menor que 0.',
      400,
    );
  }

  const idMovimiento = createId('mov');

  // Inventario inicial carga stock sin historial; ajustes corrigen diferencias
  // posteriores. Todo ajuste genera movimiento y ventas se implementara despues.
  await inventoryRepository.registerManualInventoryAdjustment(env, auth.user.id_usuario, {
    idMovimiento,
    idVariante: input.idVariante,
    tipoAjuste: input.tipoAjuste,
    cantidad: input.cantidad,
    stockAntes,
    stockDespues,
    motivo: input.motivo,
  });

  const movimientoCreado = await inventoryRepository.movementExists(env, idMovimiento);

  if (!movimientoCreado) {
    throw new ApiError(
      'INVENTORY_ADJUSTMENT_NOT_APPLIED',
      'No se pudo aplicar el ajuste de inventario.',
      409,
    );
  }

  return {
    id_variante: input.idVariante,
    tipo_ajuste: input.tipoAjuste,
    cantidad: input.cantidad,
    stock_antes: stockAntes,
    stock_despues: stockDespues,
    movimiento_creado: movimientoCreado,
  };
}
