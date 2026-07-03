import { describe, expect, it } from 'vitest';
import { canShowCancelButton, salePreviewTotal } from './SalesPage';
import type { SaleSummary } from '../types';

const baseSale: SaleSummary = {
  idVenta: 'ven_1',
  numeroVenta: 'VTA-1',
  tipoVenta: 'CONTADO',
  estadoVenta: 'COMPLETADA',
  total: 50000,
  saldoPendiente: 0,
  cliente: null,
  vendedor: {
    idUsuario: 'usr_1',
    nombreCompleto: 'Admin',
    correo: 'admin@gmail.com',
  },
  creadoEn: '2026-01-01T00:00:00.000Z',
  cantidadItems: 1,
};

describe('SalesPage helpers', () => {
  it('calcula total como vista previa', () => {
    expect(
      salePreviewTotal([
        { id_variante: 'var_1', cantidad: 2, precio_unitario: 10000 },
        { id_variante: 'var_2', cantidad: 1, precio_unitario: 5000 },
      ]),
    ).toBe(25000);
  });

  it('solo administrador ve anulacion para venta no anulada', () => {
    expect(canShowCancelButton('ADMINISTRADOR', baseSale)).toBe(true);
    expect(canShowCancelButton('VENDEDOR', baseSale)).toBe(false);
    expect(canShowCancelButton('ADMINISTRADOR', { ...baseSale, estadoVenta: 'ANULADA' })).toBe(
      false,
    );
  });
});
