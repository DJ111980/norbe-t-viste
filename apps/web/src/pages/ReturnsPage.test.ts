import { describe, expect, it } from 'vitest';
import type { SaleDetail, SaleReturn } from '../types';
import {
  availableQuantityForLine,
  canShowReturnForm,
  impactMessageForSaleType,
  returnedQuantityForLine,
  validateReturnDraft,
} from './ReturnsPage';

function sale(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    idVenta: 'ven_1',
    numeroVenta: 'VTA-1',
    tipoVenta: 'CONTADO',
    estadoVenta: 'COMPLETADA',
    total: 100000,
    saldoPendiente: 0,
    cliente: null,
    vendedor: {
      idUsuario: 'usr_1',
      nombreCompleto: 'Admin',
      correo: 'admin@example.com',
    },
    creadoEn: '2026-01-01T00:00:00.000Z',
    cantidadItems: 1,
    subtotal: 100000,
    descuento: 0,
    valorPagadoInicial: 0,
    observaciones: null,
    anuladoEn: null,
    motivoAnulacion: null,
    actualizadoEn: '2026-01-01T00:00:00.000Z',
    detalles: [
      {
        idDetalle: 'det_1',
        idVariante: 'var_1',
        nombreProducto: 'Camisa',
        sku: 'SKU-1',
        codigoQr: 'NTV-VAR-1',
        talla: 'M',
        color: 'Rojo',
        cantidad: 2,
        precioUnitario: 50000,
        subtotal: 100000,
      },
    ],
    pagos: [],
    resumen: {
      subtotal: 100000,
      descuento: 0,
      total: 100000,
      saldoPendiente: 0,
      cantidadItems: 1,
      pagosRegistrados: 0,
    },
    ...overrides,
  };
}

function saleReturn(overrides: Partial<SaleReturn> = {}): SaleReturn {
  return {
    idDevolucion: 'dev_1',
    idVenta: 'ven_1',
    tipoVenta: 'CONTADO',
    motivo: 'Demo',
    estadoDevolucion: 'ACTIVA',
    totalDevuelto: 50000,
    impactoCredito: 0,
    impactoPago: 50000,
    creadoPor: {
      idUsuario: 'usr_1',
      nombreCompleto: 'Admin',
      correo: 'admin@example.com',
    },
    creadoEn: '2026-01-01T00:00:00.000Z',
    anuladoEn: null,
    motivoAnulacion: null,
    detalles: [
      {
        id_detalle_devolucion: 'devdet_1',
        id_devolucion: 'dev_1',
        id_detalle_venta: 'det_1',
        id_variante: 'var_1',
        cantidad_devuelta: 1,
        precio_unitario: 50000,
        subtotal_devuelto: 50000,
        stock_antes: 1,
        stock_despues: 2,
        id_movimiento: 'mov_1',
        creado_en: '2026-01-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('ReturnsPage rules', () => {
  it('muestra formulario solo para ADMINISTRADOR con venta activa', () => {
    expect(canShowReturnForm('ADMINISTRADOR', sale())).toBe(true);
    expect(canShowReturnForm('VENDEDOR', sale())).toBe(false);
    expect(canShowReturnForm('ADMINISTRADOR', sale({ estadoVenta: 'ANULADA' }))).toBe(false);
  });

  it('calcula cantidad devuelta y disponible de forma informativa', () => {
    const selectedSale = sale();
    const returns = [saleReturn()];

    expect(returnedQuantityForLine(returns, 'det_1')).toBe(1);
    expect(availableQuantityForLine(selectedSale.detalles[0], returns)).toBe(1);
  });

  it('valida motivo, detalles y cantidades antes de guardar', () => {
    const selectedSale = sale();

    expect(validateReturnDraft({ motivo: '', detalles: [] }, selectedSale, [])).toBe(
      'El motivo de la devolucion es obligatorio.',
    );
    expect(
      validateReturnDraft(
        { motivo: 'Demo', detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 0 }] },
        selectedSale,
        [],
      ),
    ).toBe('La cantidad devuelta debe ser un entero mayor que 0.');
    expect(
      validateReturnDraft(
        { motivo: 'Demo', detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: -1 }] },
        selectedSale,
        [],
      ),
    ).toBe('La cantidad devuelta debe ser un entero mayor que 0.');
    expect(
      validateReturnDraft(
        { motivo: 'Demo', detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 3 }] },
        selectedSale,
        [],
      ),
    ).toBe('La cantidad devuelta no puede superar la cantidad vendida.');
    expect(
      validateReturnDraft(
        { motivo: 'Demo', detalles: [{ id_detalle_venta: 'det_1', cantidad_devuelta: 2 }] },
        selectedSale,
        [saleReturn()],
      ),
    ).toBe('La cantidad devuelta supera la cantidad disponible para devolver.');
  });

  it('muestra mensajes informativos por tipo de venta', () => {
    expect(impactMessageForSaleType('CONTADO')).toContain('No modifica pagos');
    expect(impactMessageForSaleType('CREDITO')).toContain('reducir el saldo');
    expect(impactMessageForSaleType('MIXTA')).toContain('pago inicial');
  });
});
