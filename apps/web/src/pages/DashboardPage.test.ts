import { describe, expect, it } from 'vitest';
import type { DashboardSummary } from '../types';
import { totalAlerts } from './DashboardPage';

function summary(): DashboardSummary {
  return {
    periodo: {
      fechaDesde: '2026-01-01T00:00:00.000Z',
      fechaHasta: '2026-01-31T23:59:59.999Z',
    },
    ventas: {
      cantidad_total: 1,
      total_vendido: 100000,
      total_contado: 100000,
      total_credito: 0,
      total_mixto: 0,
      ventas_anuladas: 0,
    },
    pagos: {
      total_recibido: 100000,
    },
    cartera: {
      saldo_pendiente_total: 0,
      creditos_pendientes: 0,
      creditos_pagados: 0,
      creditos_anulados: 0,
    },
    inventario: {
      variantes_total: 3,
      variantes_activas: 2,
      stock_total: 10,
      variantes_sin_stock: 1,
      variantes_bajo_stock: 2,
    },
    devoluciones: {
      cantidad_total: 1,
      total_devuelto: 10000,
    },
    lotes: {
      lotes_borrador: 1,
      lotes_confirmados: 2,
      lotes_anulados: 0,
    },
    alertas: {
      variantes_sin_qr: 1,
      variantes_sin_imagen: 2,
      productos_sin_imagen: 3,
      creditos_con_saldo: 4,
    },
  };
}

describe('DashboardPage helpers', () => {
  it('suma las alertas principales del dashboard', () => {
    expect(totalAlerts(summary())).toBe(10);
  });
});
