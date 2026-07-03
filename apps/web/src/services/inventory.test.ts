import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import {
  listInventoryVariants,
  registerInitialInventory,
  registerInventoryAdjustment,
} from './inventory';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('inventory service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta inventario sin exponer edicion directa de stock', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ variantes: [] });

    await listInventoryVariants('token', { buscar: 'sku', stockBajo: true });

    expect(apiRequest).toHaveBeenCalledWith(
      '/inventario/variantes?limit=100&offset=0&buscar=sku&stock_bajo=true',
      { token: 'token' },
    );
  });

  it('usa endpoints administrativos aprobados para inventario inicial y ajustes', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        inventarioInicial: {
          items_procesados: 1,
          movimientos_creados: 1,
          total_unidades_ingresadas: 2,
        },
      })
      .mockResolvedValueOnce({
        ajuste: {
          id_variante: 'var_1',
          tipo_ajuste: 'AJUSTE_POSITIVO',
          cantidad: 1,
          stock_antes: 2,
          stock_despues: 3,
          movimiento_creado: true,
        },
      });

    await registerInitialInventory('token', {
      id_variante: 'var_1',
      cantidad_inicial: 2,
      motivo: 'conteo',
    });
    await registerInventoryAdjustment('token', {
      id_variante: 'var_1',
      tipo_ajuste: 'AJUSTE_POSITIVO',
      cantidad: 1,
      motivo: 'ajuste',
    });

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/inventario/inicial', {
      method: 'POST',
      token: 'token',
      body: {
        items: [{ id_variante: 'var_1', cantidad_inicial: 2, motivo: 'conteo' }],
      },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/inventario/ajustes', {
      method: 'POST',
      token: 'token',
      body: {
        id_variante: 'var_1',
        tipo_ajuste: 'AJUSTE_POSITIVO',
        cantidad: 1,
        motivo: 'ajuste',
      },
    });
  });
});
