import { apiRequest } from '../lib/api';
import type {
  InitialInventoryFormValues,
  InventoryAdjustmentFormValues,
  InventoryMovement,
  InventoryMovementType,
  InventoryVariant,
  VariantStatus,
} from '../types';

interface ListInventoryVariantsResponse {
  variantes: InventoryVariant[];
}

interface InventoryVariantResponse {
  variante: InventoryVariant;
}

interface ListInventoryMovementsResponse {
  movimientos: InventoryMovement[];
}

interface InitialInventoryResponse {
  inventarioInicial: {
    items_procesados: number;
    movimientos_creados: number;
    total_unidades_ingresadas: number;
  };
}

interface InventoryAdjustmentResponse {
  ajuste: {
    id_variante: string;
    tipo_ajuste: InventoryAdjustmentFormValues['tipo_ajuste'];
    cantidad: number;
    stock_antes: number;
    stock_despues: number;
    movimiento_creado: boolean;
  };
}

export interface InventoryFilters {
  buscar?: string;
  estado?: VariantStatus | '';
  stockBajo?: boolean;
  sinStock?: boolean;
}

export interface MovementFilters {
  tipoMovimiento?: InventoryMovementType | '';
}

export async function listInventoryVariants(
  token: string,
  filters: InventoryFilters = {},
): Promise<InventoryVariant[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (filters.buscar?.trim()) params.set('buscar', filters.buscar.trim());
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.stockBajo !== undefined) params.set('stock_bajo', String(filters.stockBajo));
  if (filters.sinStock !== undefined) params.set('sin_stock', String(filters.sinStock));

  const data = await apiRequest<ListInventoryVariantsResponse>(`/inventario/variantes?${params}`, {
    token,
  });

  return data.variantes;
}

export async function getInventoryVariant(
  token: string,
  idVariante: string,
): Promise<InventoryVariant> {
  const data = await apiRequest<InventoryVariantResponse>(`/inventario/variantes/${idVariante}`, {
    token,
  });

  return data.variante;
}

export async function listInventoryMovements(
  token: string,
  filters: MovementFilters = {},
): Promise<InventoryMovement[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (filters.tipoMovimiento) params.set('tipo_movimiento', filters.tipoMovimiento);

  const data = await apiRequest<ListInventoryMovementsResponse>(
    `/inventario/movimientos?${params}`,
    { token },
  );

  return data.movimientos;
}

export async function listVariantInventoryMovements(
  token: string,
  idVariante: string,
): Promise<InventoryMovement[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });
  const data = await apiRequest<ListInventoryMovementsResponse>(
    `/inventario/variantes/${idVariante}/movimientos?${params}`,
    { token },
  );

  return data.movimientos;
}

export async function registerInitialInventory(
  token: string,
  values: InitialInventoryFormValues,
): Promise<InitialInventoryResponse['inventarioInicial']> {
  const data = await apiRequest<
    InitialInventoryResponse,
    { items: Array<{ id_variante: string; cantidad_inicial: number; motivo: string }> }
  >('/inventario/inicial', {
    method: 'POST',
    token,
    body: {
      items: [
        {
          id_variante: values.id_variante,
          cantidad_inicial: values.cantidad_inicial,
          motivo: values.motivo,
        },
      ],
    },
  });

  return data.inventarioInicial;
}

export async function registerInventoryAdjustment(
  token: string,
  values: InventoryAdjustmentFormValues,
): Promise<InventoryAdjustmentResponse['ajuste']> {
  const data = await apiRequest<InventoryAdjustmentResponse, InventoryAdjustmentFormValues>(
    '/inventario/ajustes',
    {
      method: 'POST',
      token,
      body: values,
    },
  );

  return data.ajuste;
}
