import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { createSaleReturn, listSaleReturns } from './returns';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('returns service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta devoluciones de una venta', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ devoluciones: [] });

    await listSaleReturns('token', 'ven_1');

    expect(apiRequest).toHaveBeenCalledWith('/ventas/ven_1/devoluciones', { token: 'token' });
  });

  it('registra devolucion parcial con motivo y detalles', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ devolucion: { id_devolucion: 'dev_1' } });

    await createSaleReturn('token', 'ven_1', {
      motivo: 'Cliente devuelve una prenda',
      detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 1 }],
    });

    expect(apiRequest).toHaveBeenCalledWith('/ventas/ven_1/devoluciones', {
      method: 'POST',
      token: 'token',
      body: {
        motivo: 'Cliente devuelve una prenda',
        detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 1 }],
      },
    });
  });
});
