import { describe, expect, it } from 'vitest';
import { toCashSaleSummary, toPublicSaleDetail, toPublicSalePayment } from './sales.mapper';

describe('sales mapper', () => {
  it('devuelve resumen publico sin datos internos innecesarios', () => {
    const summary = toCashSaleSummary({
      id_venta: 'ven_1',
      numero_venta: 'VTA-20260702-ABC',
      tipo_venta: 'CONTADO',
      estado_venta: 'COMPLETADA',
      total: 50000,
      saldo_pendiente: 0,
      items_vendidos: 1,
      movimientos_creados: 1,
      pago: {
        metodo_pago: 'EFECTIVO',
        valor_pagado: 50000,
      },
    });

    expect(summary).toMatchObject({
      id_venta: 'ven_1',
      tipo_venta: 'CONTADO',
      saldo_pendiente: 0,
    });
    expect(summary).not.toHaveProperty('contrasena_hash');
  });

  it('detalle publico usa datos congelados y no expone costos', () => {
    const detail = toPublicSaleDetail({
      id_venta: 'ven_1',
      numero_venta: 'VTA-20260702-ABC',
      id_cliente: null,
      id_usuario: 'usr_1',
      tipo_venta: 'CONTADO',
      subtotal: 50000,
      descuento: 0,
      total: 50000,
      valor_pagado_inicial: 50000,
      saldo_pendiente: 0,
      estado_venta: 'COMPLETADA',
      observaciones: null,
      creado_en: '2026-07-02',
      actualizado_en: '2026-07-02',
      anulado_por: null,
      anulado_en: null,
      motivo_anulacion: null,
      cliente_nombre: null,
      vendedor_nombre: 'Vendedor',
      vendedor_correo: 'vendedor@norbe.test',
      cantidad_items: 1,
      detalles: [
        {
          id_detalle_venta: 'det_1',
          id_venta: 'ven_1',
          id_variante: 'var_1',
          codigo_qr: 'NTV-VAR-000001',
          nombre_producto: 'Nombre congelado',
          sku: 'SKU-CONGELADO',
          talla: 'M',
          color: 'Azul',
          cantidad: 1,
          precio_unitario: 50000,
          descuento: 0,
          subtotal: 50000,
          creado_en: '2026-07-02',
        },
      ],
      pagos: [],
    });

    expect(detail.detalles[0]).toMatchObject({
      nombreProducto: 'Nombre congelado',
      sku: 'SKU-CONGELADO',
    });
    expect(JSON.stringify(detail)).not.toContain('precio_compra');
  });

  it('mapea pagos de venta', () => {
    const payment = toPublicSalePayment({
      id_pago_venta: 'pag_1',
      id_venta: 'ven_1',
      metodo_pago: 'EFECTIVO',
      valor_pagado: 50000,
      referencia_pago: null,
      observaciones: null,
      creado_en: '2026-07-02',
      id_usuario: 'usr_1',
      estado_pago: 'ACTIVO',
      anulado_en: null,
      motivo_anulacion: null,
      usuario_nombre: 'Vendedor',
      usuario_correo: 'vendedor@norbe.test',
    });

    expect(payment).toMatchObject({
      idPago: 'pag_1',
      monto: 50000,
      estadoPago: 'ACTIVO',
      usuario: { idUsuario: 'usr_1' },
    });
  });
});
