import { describe, expect, it } from 'vitest';
import type { CreditDetail, CreditPayment } from '../types';
import {
  canShowCreditAdjustmentForm,
  canShowCreditCancel,
  canShowCreditPaymentCancel,
  canShowCreditPaymentForm,
  isPositiveAmount,
} from './PortfolioPage';

function credit(overrides: Partial<CreditDetail> = {}): CreditDetail {
  return {
    idCredito: 'cre_1',
    origenCredito: 'DEUDA_ANTIGUA',
    tipoDeudaAntigua: 'SOLO_MONTO',
    descripcionCredito: null,
    montoInicial: 100000,
    montoAbonado: 0,
    saldoPendiente: 100000,
    fechaCredito: '2026-01-01T00:00:00.000Z',
    fechaVencimiento: null,
    estadoCredito: 'PENDIENTE',
    anuladoEn: null,
    motivoAnulacion: null,
    cliente: {
      idCliente: 'cli_1',
      nombreCompleto: 'Cliente Demo',
      documento: null,
      telefono: null,
    },
    idVenta: null,
    venta: null,
    observaciones: null,
    creadoEn: '2026-01-01T00:00:00.000Z',
    actualizadoEn: '2026-01-01T00:00:00.000Z',
    detalles: [],
    abonos: [],
    ajustes: [],
    resumen: {
      montoInicial: 100000,
      montoAbonado: 0,
      saldoPendiente: 100000,
      estadoCredito: 'PENDIENTE',
    },
    ...overrides,
  };
}

function payment(overrides: Partial<CreditPayment> = {}): CreditPayment {
  return {
    id_abono: 'abo_1',
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    id_usuario: 'usr_1',
    valor_abono: 10000,
    metodo_pago: 'EFECTIVO',
    referencia_pago: null,
    fecha_abono: '2026-01-01',
    observaciones: null,
    creado_en: '2026-01-01T00:00:00.000Z',
    estado_abono: 'ACTIVO',
    anulado_en: null,
    motivo_anulacion: null,
    usuario_nombre: 'Admin',
    ...overrides,
  };
}

describe('PortfolioPage visible rules', () => {
  it('permite abonos a ADMINISTRADOR y VENDEDOR solo con saldo activo', () => {
    expect(canShowCreditPaymentForm('ADMINISTRADOR', credit())).toBe(true);
    expect(canShowCreditPaymentForm('VENDEDOR', credit())).toBe(true);
    expect(canShowCreditPaymentForm('VENDEDOR', credit({ estadoCredito: 'ANULADO' }))).toBe(false);
    expect(canShowCreditPaymentForm('VENDEDOR', credit({ saldoPendiente: 0 }))).toBe(false);
  });

  it('reserva ajustes, anulacion de abonos y anulacion de credito para ADMINISTRADOR', () => {
    expect(canShowCreditAdjustmentForm('ADMINISTRADOR', credit())).toBe(true);
    expect(canShowCreditAdjustmentForm('VENDEDOR', credit())).toBe(false);
    expect(canShowCreditPaymentCancel('ADMINISTRADOR', payment())).toBe(true);
    expect(canShowCreditPaymentCancel('VENDEDOR', payment())).toBe(false);
    expect(canShowCreditPaymentCancel('ADMINISTRADOR', payment({ estado_abono: 'ANULADO' }))).toBe(
      false,
    );
  });

  it('solo muestra anulacion directa para deuda antigua sin abonos ni ajustes', () => {
    expect(canShowCreditCancel('ADMINISTRADOR', credit())).toBe(true);
    expect(canShowCreditCancel('VENDEDOR', credit())).toBe(false);
    expect(canShowCreditCancel('ADMINISTRADOR', credit({ origenCredito: 'VENTA' }))).toBe(false);
    expect(canShowCreditCancel('ADMINISTRADOR', credit({ estadoCredito: 'ANULADO' }))).toBe(false);
    expect(canShowCreditCancel('ADMINISTRADOR', credit({ abonos: [payment()] }))).toBe(false);
    expect(
      canShowCreditCancel(
        'ADMINISTRADOR',
        credit({
          ajustes: [
            {
              id_ajuste: 'aju_1',
              id_credito: 'cre_1',
              id_usuario: 'usr_1',
              tipo_ajuste: 'DESCUENTO',
              valor_ajuste: 1,
              saldo_antes: 2,
              saldo_despues: 1,
              motivo: 'Demo',
              creado_en: '2026-01-01',
              usuario_nombre: 'Admin',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('valida montos positivos para deuda antigua, abonos y ajustes', () => {
    expect(isPositiveAmount(1)).toBe(true);
    expect(isPositiveAmount(0)).toBe(false);
    expect(isPositiveAmount(-1)).toBe(false);
  });
});
