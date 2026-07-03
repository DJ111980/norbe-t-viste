import { describe, expect, it } from 'vitest';
import { toPublicSaleReturn } from './returns.mapper';
import type { SaleReturnViewRecord } from './returns.types';

describe('returns mapper', () => {
  it('mapea devolucion de venta a contrato publico', () => {
    const result = toPublicSaleReturn({
      id_devolucion: 'dev_1',
      id_venta: 'ven_1',
      tipo_venta: 'CONTADO',
      motivo: 'Cliente devuelve una prenda',
      estado_devolucion: 'ACTIVA',
      total_devuelto: 50000,
      impacto_credito: 0,
      impacto_pago: 50000,
      creado_por: 'usr_admin',
      creado_en: '2026-07-03',
      anulado_por: null,
      anulado_en: null,
      motivo_anulacion: null,
      creado_por_nombre: 'Admin',
      creado_por_correo: 'admin@example.com',
      detalles: [
        {
          id_detalle_devolucion: 'devdet_1',
          id_devolucion: 'dev_1',
          id_detalle_venta: 'det_1',
          id_variante: 'var_1',
          cantidad_devuelta: 1,
          precio_unitario: 50000,
          subtotal_devuelto: 50000,
          stock_antes: 2,
          stock_despues: 3,
          id_movimiento: 'mov_1',
          creado_en: '2026-07-03',
        },
      ],
    } satisfies SaleReturnViewRecord);

    expect(result).toMatchObject({
      idDevolucion: 'dev_1',
      totalDevuelto: 50000,
      impactoCredito: 0,
      impactoPago: 50000,
      creadoPor: { idUsuario: 'usr_admin' },
      detalles: [{ id_movimiento: 'mov_1' }],
    });
  });
});
