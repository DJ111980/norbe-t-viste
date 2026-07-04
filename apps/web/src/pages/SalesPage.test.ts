import { describe, expect, it } from 'vitest';
import { canShowCancelButton, salePreviewTotal, salePreviewTotals } from './SalesPage';
import type { SaleSummary } from '../types';

const baseSale: SaleSummary = {
  idVenta: 'ven_1',
  numeroVenta: 'VTA-1',
  tipoVenta: 'CONTADO',
  estadoVenta: 'COMPLETADA',
  subtotal: 50000,
  descuento: 0,
  total: 50000,
  saldoPendiente: 0,
  cliente: null,
  vendedor: {
    idUsuario: 'usr_1',
    nombreCompleto: 'Admin',
    correo: 'admin@gmail.com',
  },
  creadoEn: '2026-01-01T00:00:00.000Z',
  fechaVenta: '2026-01-01T00:00:00-05:00',
  cantidadItems: 1,
};

describe('SalesPage helpers', () => {
  it('calcula total como vista previa', () => {
    expect(
      salePreviewTotal([
        { id_variante: 'var_1', cantidad: 2, precio_unitario: 10000, descuento: 0 },
        { id_variante: 'var_2', cantidad: 1, precio_unitario: 5000, descuento: 0 },
      ]),
    ).toBe(25000);
  });

  it('calcula total con descuentos de linea y general', () => {
    expect(
      salePreviewTotals(
        [
          { id_variante: 'var_1', cantidad: 2, precio_unitario: 10000, descuento: 3000 },
          { id_variante: 'var_2', cantidad: 1, precio_unitario: 5000, descuento: 0 },
        ],
        2000,
      ),
    ).toMatchObject({
      subtotalBruto: 25000,
      descuentoLineas: 3000,
      descuentoGeneral: 2000,
      descuentoTotal: 5000,
      totalFinal: 20000,
    });
  });

  it('solo administrador ve anulacion para venta no anulada', () => {
    expect(canShowCancelButton('ADMINISTRADOR', baseSale)).toBe(true);
    expect(canShowCancelButton('VENDEDOR', baseSale)).toBe(false);
    expect(canShowCancelButton('ADMINISTRADOR', { ...baseSale, estadoVenta: 'ANULADA' })).toBe(
      false,
    );
  });
});
