import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import {
  cancelCredit,
  cancelCreditPayment,
  createCreditAdjustment,
  createCreditPayment,
  createOldDebt,
  listClientCredits,
  listCredits,
} from './credits';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('credits service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta creditos con filtros reales', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ creditos: [] });

    await listCredits('token', {
      cliente: 'cli_1',
      estado: 'PARCIAL',
      origenCredito: 'VENTA',
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-01-31',
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/creditos?limit=100&offset=0&cliente=cli_1&estado=PARCIAL&origen_credito=VENTA&fecha_desde=2026-01-01&fecha_hasta=2026-01-31',
      { token: 'token' },
    );
  });

  it('consulta creditos de cliente por endpoint dedicado', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ creditos: [] });

    await listClientCredits('token', 'cli_1');

    expect(apiRequest).toHaveBeenCalledWith('/clientes/cli_1/creditos', { token: 'token' });
  });

  it('crea deuda antigua con monto y cliente', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ credito: { id_credito: 'cre_1' } });

    await createOldDebt('token', {
      id_cliente: 'cli_1',
      monto_inicial: 100000,
      descripcion: 'Saldo anterior',
      tipo_deuda_antigua: 'SOLO_MONTO',
    });

    expect(apiRequest).toHaveBeenCalledWith('/creditos/deuda-antigua', {
      method: 'POST',
      token: 'token',
      body: {
        id_cliente: 'cli_1',
        monto_inicial: 100000,
        descripcion: 'Saldo anterior',
        tipo_deuda_antigua: 'SOLO_MONTO',
      },
    });
  });

  it('registra y anula abonos sin crear ajustes', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ abono: { id_abono: 'abo_1' } })
      .mockResolvedValueOnce({ anulacion: { id_abono: 'abo_1' } });

    await createCreditPayment('token', 'cre_1', {
      valor_abono: 25000,
      metodo_pago: 'NEQUI',
      referencia_pago: '',
      observaciones: '',
    });
    await cancelCreditPayment('token', 'cre_1', 'abo_1', 'Pago duplicado');

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/creditos/cre_1/abonos', {
      method: 'POST',
      token: 'token',
      body: {
        valor_abono: 25000,
        metodo_pago: 'NEQUI',
        referencia_pago: null,
        observaciones: null,
      },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/creditos/cre_1/abonos/abo_1/anular', {
      method: 'POST',
      token: 'token',
      body: { motivo_anulacion: 'Pago duplicado' },
    });
  });

  it('registra ajustes y anula credito independiente con motivo', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ ajuste: { id_ajuste: 'aju_1' } })
      .mockResolvedValueOnce({ anulacion: { id_credito: 'cre_1' } });

    await createCreditAdjustment('token', 'cre_1', {
      tipo_ajuste: 'DESCUENTO',
      valor_ajuste: 10000,
      saldo_final: 0,
      motivo: 'Descuento autorizado',
    });
    await cancelCredit('token', 'cre_1', 'Deuda registrada por error');

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/creditos/cre_1/ajustes', {
      method: 'POST',
      token: 'token',
      body: {
        tipo_ajuste: 'DESCUENTO',
        valor_ajuste: 10000,
        motivo: 'Descuento autorizado',
      },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/creditos/cre_1/anular', {
      method: 'POST',
      token: 'token',
      body: { motivo_anulacion: 'Deuda registrada por error' },
    });
  });
});
