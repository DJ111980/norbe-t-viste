import { describe, expect, it } from 'vitest';
import { toOldDebtResult, toPublicCreditDetail, toPublicCreditSummary } from './credits.mapper';
import type { CreditDetailViewRecord, CreditRecord } from './credits.types';

function buildCredit(overrides: Partial<CreditRecord> = {}): CreditRecord {
  return {
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    id_venta: null,
    id_usuario: 'usr_1',
    origen_credito: 'DEUDA_ANTIGUA',
    tipo_deuda_antigua: 'SOLO_MONTO',
    descripcion_credito: 'Deuda vieja',
    monto_inicial: 150000,
    monto_abonado: 0,
    saldo_pendiente: 150000,
    fecha_credito: '2026-07-02',
    fecha_vencimiento: null,
    estado_credito: 'PENDIENTE',
    observaciones: 'Deuda vieja',
    creado_en: '2026-07-02',
    actualizado_en: '2026-07-02',
    actualizado_por: 'usr_1',
    anulado_por: null,
    anulado_en: null,
    motivo_anulacion: null,
    cliente_nombre: 'Cliente Uno',
    cliente_documento: '123',
    cliente_telefono: '300',
    ...overrides,
  };
}

describe('credits mapper', () => {
  it('mapea resumen publico sin datos internos innecesarios', () => {
    const summary = toPublicCreditSummary(buildCredit());

    expect(summary).toMatchObject({
      idCredito: 'cre_1',
      origenCredito: 'DEUDA_ANTIGUA',
      saldoPendiente: 150000,
      cliente: { idCliente: 'cli_1', nombreCompleto: 'Cliente Uno' },
    });
    expect(summary).not.toHaveProperty('actualizado_por');
    expect(JSON.stringify(summary)).not.toContain('contrasena');
  });

  it('mapea detalle con venta, abonos y ajustes', () => {
    const detail = toPublicCreditDetail({
      ...buildCredit(),
      venta: null,
      detalles: [],
      abonos: [],
      ajustes: [],
    } satisfies CreditDetailViewRecord);

    expect(detail.resumen).toEqual({
      montoInicial: 150000,
      montoAbonado: 0,
      saldoPendiente: 150000,
      estadoCredito: 'PENDIENTE',
    });
    expect(detail.abonos).toHaveLength(0);
    expect(detail.ajustes).toHaveLength(0);
  });

  it('mapea resultado de deuda antigua', () => {
    expect(toOldDebtResult(buildCredit())).toEqual({
      id_credito: 'cre_1',
      id_cliente: 'cli_1',
      origen_credito: 'DEUDA_ANTIGUA',
      tipo_deuda_antigua: 'SOLO_MONTO',
      monto_inicial: 150000,
      monto_abonado: 0,
      saldo_pendiente: 150000,
      estado_credito: 'PENDIENTE',
    });
  });
});
