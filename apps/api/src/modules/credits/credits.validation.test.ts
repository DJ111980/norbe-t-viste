import { describe, expect, it } from 'vitest';
import {
  validateCancelCreditInput,
  validateCancelCreditPaymentInput,
  validateCreateCreditAdjustmentInput,
  validateCreateCreditPaymentInput,
  validateCreateOldDebtInput,
  validateListClientCreditsFilters,
  validateListCreditsFilters,
} from './credits.validation';

describe('credits validation', () => {
  it('valida filtros de creditos y limita paginacion', () => {
    const filters = validateListCreditsFilters(
      new URLSearchParams({
        cliente: 'cli_1',
        estado: 'PENDIENTE',
        origen_credito: 'DEUDA_ANTIGUA',
        saldo_pendiente: 'true',
        fecha_desde: '2026-07-01',
        fecha_hasta: '2026-07-02',
        limit: '500',
        offset: '10',
      }),
    );

    expect(filters).toMatchObject({
      cliente: 'cli_1',
      estado: 'PENDIENTE',
      origenCredito: 'DEUDA_ANTIGUA',
      saldoPendiente: true,
      limit: 100,
      offset: 10,
    });
  });

  it('valida filtros de creditos por cliente', () => {
    const filters = validateListClientCreditsFilters(
      new URLSearchParams({
        estado: 'PARCIAL',
        origen_credito: 'VENTA',
        saldo_pendiente: 'false',
      }),
    );

    expect(filters).toMatchObject({
      estado: 'PARCIAL',
      origenCredito: 'VENTA',
      saldoPendiente: false,
      limit: 50,
      offset: 0,
    });
  });

  it('rechaza filtros invalidos', () => {
    expect(() =>
      validateListCreditsFilters(new URLSearchParams({ estado: 'ACTIVO' })),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_STATUS' }));

    expect(() =>
      validateListCreditsFilters(new URLSearchParams({ origen_credito: 'MANUAL' })),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_ORIGIN' }));

    expect(() =>
      validateListCreditsFilters(new URLSearchParams({ saldo_pendiente: 'si' })),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_BOOLEAN_FILTER' }));
  });

  it('valida deuda antigua', () => {
    const input = validateCreateOldDebtInput({
      id_cliente: 'cli_1',
      monto_inicial: 150000,
      descripcion: ' Deuda registrada antes del sistema ',
      tipo_deuda_antigua: 'SOLO_MONTO',
    });

    expect(input).toEqual({
      idCliente: 'cli_1',
      montoInicial: 150000,
      descripcion: 'Deuda registrada antes del sistema',
      tipoDeudaAntigua: 'SOLO_MONTO',
    });
  });

  it('rechaza deuda antigua invalida', () => {
    expect(() => validateCreateOldDebtInput({})).toThrowError(
      expect.objectContaining({ code: 'OLD_DEBT_TYPE_REQUIRED' }),
    );

    expect(() =>
      validateCreateOldDebtInput({
        id_cliente: 'cli_1',
        monto_inicial: 0,
        descripcion: 'x',
        tipo_deuda_antigua: 'SOLO_MONTO',
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_OLD_DEBT_AMOUNT' }));

    expect(() =>
      validateCreateOldDebtInput({
        id_cliente: 'cli_1',
        monto_inicial: 1000,
        descripcion: ' ',
        tipo_deuda_antigua: 'SOLO_MONTO',
      }),
    ).toThrowError(expect.objectContaining({ code: 'OLD_DEBT_DESCRIPTION_REQUIRED' }));

    expect(() =>
      validateCreateOldDebtInput({
        id_cliente: 'cli_1',
        monto_inicial: 1000,
        descripcion: 'x',
        tipo_deuda_antigua: 'OTRA',
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_OLD_DEBT_TYPE' }));
  });

  it('valida abono de credito', () => {
    const input = validateCreateCreditPaymentInput({
      valor_abono: 50000,
      metodo_pago: ' EFECTIVO ',
      referencia_pago: ' Caja 1 ',
      observaciones: ' Pago parcial ',
    });

    expect(input).toEqual({
      valorAbono: 50000,
      metodoPago: 'EFECTIVO',
      referenciaPago: 'Caja 1',
      observaciones: 'Pago parcial',
    });
  });

  it('normaliza textos opcionales vacios del abono', () => {
    const input = validateCreateCreditPaymentInput({
      valor_abono: 50000,
      metodo_pago: 'NEQUI',
      referencia_pago: ' ',
      observaciones: '',
    });

    expect(input).toMatchObject({
      referenciaPago: null,
      observaciones: null,
    });
  });

  it('rechaza abono de credito invalido', () => {
    expect(() => validateCreateCreditPaymentInput(null)).toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDIT_PAYMENT' }),
    );

    expect(() =>
      validateCreateCreditPaymentInput({ valor_abono: 0, metodo_pago: 'EFECTIVO' }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_PAYMENT_AMOUNT' }));

    expect(() => validateCreateCreditPaymentInput({ valor_abono: 1000 })).toThrowError(
      expect.objectContaining({ code: 'PAYMENT_METHOD_REQUIRED' }),
    );

    expect(() =>
      validateCreateCreditPaymentInput({ valor_abono: 1000, metodo_pago: 'CHEQUE' }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PAYMENT_METHOD' }));
  });

  it('valida anulacion de abono de credito', () => {
    const input = validateCancelCreditPaymentInput({
      motivo_anulacion: ' Abono registrado por error ',
    });

    expect(input).toEqual({
      motivoAnulacion: 'Abono registrado por error',
    });
  });

  it('rechaza anulacion de abono invalida', () => {
    expect(() => validateCancelCreditPaymentInput(null)).toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDIT_PAYMENT_CANCELLATION' }),
    );

    expect(() => validateCancelCreditPaymentInput({ motivo_anulacion: ' ' })).toThrowError(
      expect.objectContaining({ code: 'CREDIT_PAYMENT_CANCELLATION_REASON_REQUIRED' }),
    );
  });

  it('valida anulacion directa de credito', () => {
    const input = validateCancelCreditInput({
      motivo_anulacion: ' Credito registrado por error ',
    });

    expect(input).toEqual({
      motivoAnulacion: 'Credito registrado por error',
    });
  });

  it('rechaza anulacion directa de credito invalida', () => {
    expect(() => validateCancelCreditInput(null)).toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDIT_CANCELLATION' }),
    );

    expect(() => validateCancelCreditInput({ motivo_anulacion: ' ' })).toThrowError(
      expect.objectContaining({ code: 'CREDIT_CANCELLATION_REASON_REQUIRED' }),
    );
  });

  it('valida ajuste AUMENTO y DESCUENTO', () => {
    expect(
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'AUMENTO',
        valor_ajuste: 20000,
        motivo: ' Correccion por saldo faltante ',
      }),
    ).toEqual({
      tipoAjuste: 'AUMENTO',
      valorAjuste: 20000,
      motivo: 'Correccion por saldo faltante',
    });

    expect(
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'DESCUENTO',
        valor_ajuste: 10000,
        motivo: 'Descuento autorizado',
      }),
    ).toMatchObject({
      tipoAjuste: 'DESCUENTO',
      valorAjuste: 10000,
    });
  });

  it('valida ajuste CORRECCION con saldo final', () => {
    expect(
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'CORRECCION',
        saldo_final: 0,
        motivo: 'Correccion manual',
      }),
    ).toEqual({
      tipoAjuste: 'CORRECCION',
      saldoFinal: 0,
      motivo: 'Correccion manual',
    });
  });

  it('rechaza ajuste invalido', () => {
    expect(() => validateCreateCreditAdjustmentInput(null)).toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDIT_ADJUSTMENT' }),
    );

    expect(() => validateCreateCreditAdjustmentInput({})).toThrowError(
      expect.objectContaining({ code: 'CREDIT_ADJUSTMENT_TYPE_REQUIRED' }),
    );

    expect(() =>
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'ANULACION',
        valor_ajuste: 1000,
        motivo: 'x',
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_ADJUSTMENT_TYPE' }));

    expect(() =>
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'AUMENTO',
        valor_ajuste: 1000,
        motivo: ' ',
      }),
    ).toThrowError(expect.objectContaining({ code: 'CREDIT_ADJUSTMENT_REASON_REQUIRED' }));

    expect(() =>
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'AUMENTO',
        valor_ajuste: 0,
        motivo: 'x',
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_ADJUSTMENT_AMOUNT' }));

    expect(() =>
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'DESCUENTO',
        valor_ajuste: -1,
        motivo: 'x',
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_ADJUSTMENT_AMOUNT' }));

    expect(() =>
      validateCreateCreditAdjustmentInput({
        tipo_ajuste: 'CORRECCION',
        saldo_final: -1,
        motivo: 'x',
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CREDIT_ADJUSTMENT_FINAL_BALANCE' }));
  });
});
