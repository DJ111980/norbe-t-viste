import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import {
  toPublicEntryLot,
  toPublicEntryLotDetail,
  toPublicEntryLotSummary,
} from './entry-lots.mapper';
import * as entryLotsRepository from './entry-lots.repository';
import type {
  CreateEntryLotDetailInput,
  CreateEntryLotInput,
  ConfirmEntryLotResult,
  EntryLotDetailRecord,
  EntryLotRecord,
  ListEntryLotsFilters,
  PublicEntryLot,
  PublicEntryLotDetail,
  PublicEntryLotSummary,
  UpdateEntryLotDetailInput,
  UpdateEntryLotInput,
} from './entry-lots.types';

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createLotNumber(): string {
  const compactDate = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `NTV-LOT-${compactDate}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function assertEditableDraft(lot: EntryLotRecord): void {
  if (lot.estado_lote === 'CONFIRMADO') {
    throw new ApiError(
      'ENTRY_LOT_ALREADY_CONFIRMED',
      'No se puede modificar un lote confirmado.',
      400,
    );
  }

  if (lot.estado_lote === 'ANULADO') {
    throw new ApiError('ENTRY_LOT_CANCELLED', 'No se puede modificar un lote anulado.', 400);
  }
}

function assertConfirmableDraft(lot: EntryLotRecord): void {
  if (lot.estado_lote === 'CONFIRMADO') {
    throw new ApiError(
      'ENTRY_LOT_ALREADY_CONFIRMED',
      'No se puede confirmar un lote que ya fue confirmado.',
      400,
    );
  }

  if (lot.estado_lote === 'ANULADO') {
    throw new ApiError('ENTRY_LOT_CANCELLED', 'No se puede confirmar un lote anulado.', 400);
  }
}

async function ensureEntryLot(env: ApiEnv, idLote: string): Promise<EntryLotRecord> {
  const lot = await entryLotsRepository.findEntryLotById(env, idLote);

  if (!lot) {
    throw new ApiError('ENTRY_LOT_NOT_FOUND', 'El lote de entrada no existe.', 404);
  }

  return lot;
}

async function ensureActiveProvider(env: ApiEnv, idProveedor: string | null): Promise<void> {
  if (!idProveedor) return;

  const provider = await entryLotsRepository.findProviderForEntryLot(env, idProveedor);

  if (!provider) {
    throw new ApiError('PROVIDER_NOT_FOUND', 'El proveedor no existe.', 404);
  }

  if (provider.estado !== 'ACTIVO') {
    throw new ApiError('PROVIDER_INACTIVE', 'No se puede usar un proveedor inactivo.', 400);
  }
}

async function ensureActiveVariant(env: ApiEnv, idVariante: string): Promise<void> {
  const variant = await entryLotsRepository.findVariantForEntryLotDetail(env, idVariante);

  if (!variant) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  if (variant.estado !== 'ACTIVA') {
    throw new ApiError('VARIANT_INACTIVE', 'No se puede agregar una variante inactiva.', 400);
  }

  if (variant.estado_producto !== 'ACTIVO') {
    throw new ApiError(
      'PRODUCT_INACTIVE',
      'No se puede agregar una variante de un producto inactivo.',
      400,
    );
  }
}

async function ensureEntryLotDetail(
  env: ApiEnv,
  idLote: string,
  idDetalle: string,
): Promise<EntryLotDetailRecord> {
  const detail = await entryLotsRepository.findEntryLotDetailById(env, idLote, idDetalle);

  if (!detail) {
    throw new ApiError('ENTRY_LOT_DETAIL_NOT_FOUND', 'El detalle del lote no existe.', 404);
  }

  return detail;
}

function calculateSubtotal(cantidad: number, costoUnitario: number): number {
  return cantidad * costoUnitario;
}

function validateConfirmableDetails(details: EntryLotDetailRecord[]): void {
  if (details.length === 0) {
    throw new ApiError('EMPTY_ENTRY_LOT', 'No se puede confirmar un lote sin detalles.', 400);
  }

  for (const detail of details) {
    if (detail.estado_variante !== 'ACTIVA') {
      throw new ApiError(
        'VARIANT_INACTIVE',
        'No se puede confirmar un lote con variantes inactivas.',
        400,
      );
    }

    if (detail.estado_producto !== 'ACTIVO') {
      throw new ApiError(
        'PRODUCT_INACTIVE',
        'No se puede confirmar un lote con productos inactivos.',
        400,
      );
    }

    if (detail.cantidad <= 0) {
      throw new ApiError(
        'INVALID_ENTRY_LOT_DETAIL_QUANTITY',
        'La cantidad debe ser mayor que 0.',
        400,
      );
    }
  }
}

export async function listEntryLots(
  env: ApiEnv,
  auth: AuthContext,
  filters: ListEntryLotsFilters,
): Promise<PublicEntryLotSummary[]> {
  const lots = await entryLotsRepository.listEntryLots(env, filters);

  return lots.map((lot) => toPublicEntryLotSummary(lot, { role: auth.user.rol }));
}

export async function getEntryLot(
  env: ApiEnv,
  auth: AuthContext,
  idLote: string,
): Promise<PublicEntryLot> {
  const lot = await ensureEntryLot(env, idLote);
  const details = await entryLotsRepository.findEntryLotDetails(env, idLote);

  return toPublicEntryLot(lot, details, { role: auth.user.rol });
}

export async function createEntryLot(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateEntryLotInput,
): Promise<PublicEntryLot> {
  await ensureActiveProvider(env, input.idProveedor);

  // El lote nace en BORRADOR para permitir revisar detalles y costos antes de
  // impactar stock. La confirmacion y movimientos vendran en la siguiente fase.
  const lot = await entryLotsRepository.createEntryLot(
    env,
    createId('lot'),
    createLotNumber(),
    input,
    auth.user.id_usuario,
  );

  return toPublicEntryLot(lot, [], { role: auth.user.rol });
}

export async function updateEntryLot(
  env: ApiEnv,
  auth: AuthContext,
  idLote: string,
  input: UpdateEntryLotInput,
): Promise<PublicEntryLot> {
  const lot = await ensureEntryLot(env, idLote);
  assertEditableDraft(lot);
  await ensureActiveProvider(env, input.idProveedor ?? null);

  const updatedLot = await entryLotsRepository.updateEntryLot(
    env,
    idLote,
    input,
    auth.user.id_usuario,
  );
  const details = await entryLotsRepository.findEntryLotDetails(env, idLote);

  return toPublicEntryLot(updatedLot, details, { role: auth.user.rol });
}

export async function createEntryLotDetail(
  env: ApiEnv,
  auth: AuthContext,
  idLote: string,
  input: CreateEntryLotDetailInput,
): Promise<PublicEntryLotDetail> {
  const lot = await ensureEntryLot(env, idLote);
  assertEditableDraft(lot);
  await ensureActiveVariant(env, input.idVariante);

  const subtotal = calculateSubtotal(input.cantidad, input.costoUnitario);

  // cantidad_etiquetas_qr se guarda para imprimir despues, pero esta fase no
  // genera etiquetas ni imagenes QR; tampoco modifica stock ni movimientos.
  const detail = await entryLotsRepository.createEntryLotDetail(
    env,
    createId('lot_det'),
    idLote,
    input,
    subtotal,
  );

  return toPublicEntryLotDetail(detail, { role: auth.user.rol });
}

export async function updateEntryLotDetail(
  env: ApiEnv,
  auth: AuthContext,
  idLote: string,
  idDetalle: string,
  input: UpdateEntryLotDetailInput,
): Promise<PublicEntryLotDetail> {
  const lot = await ensureEntryLot(env, idLote);
  assertEditableDraft(lot);
  const currentDetail = await ensureEntryLotDetail(env, idLote, idDetalle);
  const cantidad = input.cantidad ?? currentDetail.cantidad;
  const costoUnitario = input.costoUnitario ?? currentDetail.costo_unitario;
  const subtotal = calculateSubtotal(cantidad, costoUnitario);

  const detail = await entryLotsRepository.updateEntryLotDetail(
    env,
    idLote,
    idDetalle,
    input,
    subtotal,
  );

  return toPublicEntryLotDetail(detail, { role: auth.user.rol });
}

export async function deleteEntryLotDetail(
  env: ApiEnv,
  idLote: string,
  idDetalle: string,
): Promise<{ idDetalleLote: string; eliminado: true }> {
  const lot = await ensureEntryLot(env, idLote);
  assertEditableDraft(lot);
  await ensureEntryLotDetail(env, idLote, idDetalle);

  // Borrar detalles es valido solo en BORRADOR porque aun no hubo stock,
  // movimientos ni auditoria de inventario asociados a este detalle.
  await entryLotsRepository.deleteEntryLotDetail(env, idLote, idDetalle);

  return { idDetalleLote: idDetalle, eliminado: true };
}

export async function confirmEntryLot(
  env: ApiEnv,
  auth: AuthContext,
  idLote: string,
): Promise<ConfirmEntryLotResult> {
  const lot = await ensureEntryLot(env, idLote);
  assertConfirmableDraft(lot);
  const details = await entryLotsRepository.findEntryLotDetails(env, idLote);

  validateConfirmableDetails(details);

  const stockByVariant = new Map<string, number>();
  const movements = details.map((detail) => {
    const stockAntes = stockByVariant.get(detail.id_variante) ?? detail.stock_actual;
    const stockDespues = stockAntes + detail.cantidad;
    stockByVariant.set(detail.id_variante, stockDespues);

    return {
      idMovimiento: createId('mov'),
      idVariante: detail.id_variante,
      cantidad: detail.cantidad,
      stockAntes,
      stockDespues,
    };
  });
  const totalUnidades = details.reduce((total, detail) => total + detail.cantidad, 0);

  // El stock se mueve solamente al confirmar. Cada cambio genera movimiento para
  // que el historial explique de donde salio cada unidad. En esta fase no se
  // generan etiquetas, ventas ni ajustes aunque existan datos preparados.
  await entryLotsRepository.confirmEntryLot(env, idLote, auth.user.id_usuario, movements);

  return {
    id_lote: idLote,
    estado_lote: 'CONFIRMADO',
    detalles_procesados: details.length,
    movimientos_creados: movements.length,
    total_unidades_ingresadas: totalUnidades,
  };
}
