import { describe, expect, it } from 'vitest';
import { toPublicClientPortfolio, toPublicPortfolioSummary } from './portfolio.mapper';
import type {
  PortfolioClientRecord,
  PortfolioCreditRecord,
  PortfolioSummaryRecord,
} from './portfolio.types';

function buildCredit(overrides: Partial<PortfolioCreditRecord> = {}): PortfolioCreditRecord {
  return {
    id_credito: 'cre_1',
    id_cliente: 'cli_1',
    id_venta: null,
    origen_credito: 'DEUDA_ANTIGUA',
    descripcion_credito: 'Deuda',
    monto_inicial: 100000,
    monto_abonado: 0,
    saldo_pendiente: 100000,
    fecha_credito: '2026-07-02',
    estado_credito: 'PENDIENTE',
    cliente_nombre: 'Cliente Uno',
    cliente_documento: '123',
    cliente_telefono: '300',
    ...overrides,
  };
}

const client: PortfolioClientRecord = {
  id_cliente: 'cli_1',
  nombre_completo: 'Cliente Uno',
  documento: '123',
  telefono: '300',
  estado: 'ACTIVO',
};

describe('portfolio mapper', () => {
  it('mapea resumen general', () => {
    const summary: PortfolioSummaryRecord = {
      total_creditos: 3,
      creditos_pendientes: 1,
      creditos_parciales: 1,
      creditos_pagados: 1,
      creditos_anulados: 0,
      total_monto_inicial: 300000,
      total_monto_abonado: 100000,
      total_saldo_pendiente: 200000,
      clientes_con_deuda: 2,
    };

    expect(toPublicPortfolioSummary(summary)).toMatchObject({
      totalCreditos: 3,
      totalSaldoPendiente: 200000,
      clientesConDeuda: 2,
    });
  });

  it('calcula cartera por cliente sin sumar anulados como deuda activa', () => {
    const portfolio = toPublicClientPortfolio(
      client,
      [
        buildCredit(),
        buildCredit({ id_credito: 'cre_2', estado_credito: 'PAGADO', saldo_pendiente: 0 }),
        buildCredit({ id_credito: 'cre_3', estado_credito: 'ANULADO', saldo_pendiente: 50000 }),
      ],
      {
        id_abono: 'abo_1',
        id_credito: 'cre_2',
        valor_abono: 100000,
        metodo_pago: 'EFECTIVO',
        fecha_abono: '2026-07-03',
        creado_en: '2026-07-03',
      },
    );

    expect(portfolio.resumen).toMatchObject({
      totalCreditos: 3,
      totalSaldoPendiente: 100000,
      ultimoCreditoEn: '2026-07-02',
    });
    expect(portfolio.creditosActivos).toHaveLength(1);
    expect(portfolio.creditosPagados).toHaveLength(1);
    expect(portfolio.creditosAnulados).toHaveLength(1);
    expect(portfolio.ultimoAbono?.idAbono).toBe('abo_1');
  });
});
