import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { confirmEntryLot, createEntryLotDetail, listEntryLots } from './lots';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('lots service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta lotes de entrada con filtros reales', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ lotes: [] });

    await listEntryLots('token', { estado: 'BORRADOR', buscar: 'L-1' });

    expect(apiRequest).toHaveBeenCalledWith(
      '/lotes-entrada?limit=100&offset=0&estado=BORRADOR&buscar=L-1',
      { token: 'token' },
    );
  });

  it('agrega detalles y confirma usando endpoints de backend', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ detalle: {} })
      .mockResolvedValueOnce({
        confirmacion: {
          id_lote: 'lot_1',
          estado_lote: 'CONFIRMADO',
          detalles_procesados: 1,
          movimientos_creados: 1,
          total_unidades_ingresadas: 3,
        },
      });

    await createEntryLotDetail('token', 'lot_1', {
      id_variante: 'var_1',
      cantidad: 3,
      costo_unitario: 1000,
      precio_venta_sugerido: 2000,
      observaciones: '',
    });
    await confirmEntryLot('token', 'lot_1');

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/lotes-entrada/lot_1/detalles', {
      method: 'POST',
      token: 'token',
      body: {
        id_variante: 'var_1',
        cantidad: 3,
        costo_unitario: 1000,
        precio_venta_sugerido: 2000,
        observaciones: null,
      },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/lotes-entrada/lot_1/confirmar', {
      method: 'POST',
      token: 'token',
    });
  });
});
