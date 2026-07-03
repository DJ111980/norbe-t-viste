import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { cancelSale, createSale, listSales } from './sales';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('sales service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta ventas con filtros reales', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ ventas: [] });

    await listSales('token', { buscar: 'VTA', estado: 'COMPLETADA', tipoVenta: 'CONTADO' });

    expect(apiRequest).toHaveBeenCalledWith(
      '/ventas?limit=100&offset=0&buscar=VTA&estado=COMPLETADA&tipo_venta=CONTADO',
      { token: 'token' },
    );
  });

  it('crea venta contado con metodo de pago y detalles', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ venta: { id_venta: 'ven_1' } });

    await createSale('token', {
      tipo_venta: 'CONTADO',
      id_cliente: '',
      metodo_pago: 'EFECTIVO',
      valor_pagado_inicial: 0,
      observaciones: '',
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
    });

    expect(apiRequest).toHaveBeenCalledWith('/ventas', {
      method: 'POST',
      token: 'token',
      body: {
        tipo_venta: 'CONTADO',
        id_cliente: null,
        metodo_pago: 'EFECTIVO',
        observaciones: null,
        detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
      },
    });
  });

  it('crea venta credito sin metodo de pago', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ venta: { id_venta: 'ven_1' } });

    await createSale('token', {
      tipo_venta: 'CREDITO',
      id_cliente: 'cli_1',
      metodo_pago: 'EFECTIVO',
      valor_pagado_inicial: 0,
      observaciones: 'credito',
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
    });

    expect(apiRequest).toHaveBeenCalledWith('/ventas', {
      method: 'POST',
      token: 'token',
      body: {
        tipo_venta: 'CREDITO',
        id_cliente: 'cli_1',
        observaciones: 'credito',
        detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
      },
    });
  });

  it('crea venta mixta con pago inicial y anula con motivo', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ venta: { id_venta: 'ven_1' } })
      .mockResolvedValueOnce({ anulacion: { id_venta: 'ven_1', estado_venta: 'ANULADA' } });

    await createSale('token', {
      tipo_venta: 'MIXTA',
      id_cliente: 'cli_1',
      metodo_pago: 'NEQUI',
      valor_pagado_inicial: 20000,
      observaciones: '',
      detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
    });
    await cancelSale('token', 'ven_1', 'Error en registro');

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/ventas', {
      method: 'POST',
      token: 'token',
      body: {
        tipo_venta: 'MIXTA',
        id_cliente: 'cli_1',
        valor_pagado_inicial: 20000,
        metodo_pago: 'NEQUI',
        observaciones: null,
        detalles: [{ id_variante: 'var_1', cantidad: 1, precio_unitario: 50000 }],
      },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/ventas/ven_1/anular', {
      method: 'POST',
      token: 'token',
      body: { motivo_anulacion: 'Error en registro' },
    });
  });
});
