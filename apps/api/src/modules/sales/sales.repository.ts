import type { ApiEnv } from '../../config/env';
import type {
  CashSalePersistenceStatus,
  CancelCashSaleRepositoryInput,
  CancelSalePersistenceStatus,
  CreateCashSaleRepositoryInput,
  ListSalesFilters,
  SaleClientRecord,
  SaleDetailRecord,
  SaleDetailViewRecord,
  SaleListRecord,
  SalePaymentRecord,
  SaleVariantRecord,
  VariantStockRecord,
} from './sales.types';

const SALE_LIST_COLUMNS = `
  v.id_venta,
  v.numero_venta,
  v.id_cliente,
  v.id_usuario,
  v.tipo_venta,
  v.subtotal,
  v.descuento,
  v.total,
  v.valor_pagado_inicial,
  v.saldo_pendiente,
  v.estado_venta,
  v.observaciones,
  v.creado_en,
  v.actualizado_en,
  c.nombre_completo AS cliente_nombre,
  u.nombre_completo AS vendedor_nombre,
  u.correo AS vendedor_correo,
  COALESCE(SUM(d.cantidad), 0) AS cantidad_items
`;

function applySaleFilters(where: string[], values: (string | number)[], filters: ListSalesFilters) {
  if (filters.buscar) {
    where.push(
      '(v.numero_venta LIKE ? OR v.id_venta LIKE ? OR c.nombre_completo LIKE ? OR v.observaciones LIKE ? OR u.nombre_completo LIKE ?)',
    );
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }
  if (filters.estado) {
    where.push('v.estado_venta = ?');
    values.push(filters.estado);
  }
  if (filters.tipoVenta) {
    where.push('v.tipo_venta = ?');
    values.push(filters.tipoVenta);
  }
  if (filters.cliente) {
    where.push('v.id_cliente = ?');
    values.push(filters.cliente);
  }
  if (filters.vendedor) {
    where.push('v.id_usuario = ?');
    values.push(filters.vendedor);
  }
  if (filters.fechaDesde) {
    where.push('v.creado_en >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('v.creado_en <= ?');
    values.push(filters.fechaHasta);
  }
}

export async function findClientForSale(
  env: ApiEnv,
  idCliente: string,
): Promise<SaleClientRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_cliente, estado
      FROM clientes
      WHERE id_cliente = ?
      LIMIT 1
    `,
  )
    .bind(idCliente)
    .first<SaleClientRecord>();
}

export async function findVariantForSale(
  env: ApiEnv,
  idVariante: string,
): Promise<SaleVariantRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        v.id_variante,
        v.id_producto,
        v.sku,
        v.codigo_qr,
        v.talla,
        v.color,
        v.precio_venta,
        v.stock_actual,
        v.estado,
        p.nombre_producto,
        p.estado AS estado_producto
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.id_variante = ?
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<SaleVariantRecord>();
}

export async function findVariantStockById(
  env: ApiEnv,
  idVariante: string,
): Promise<VariantStockRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_variante, stock_actual
      FROM variantes_producto
      WHERE id_variante = ?
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<VariantStockRecord>();
}

export async function createCashSale(
  env: ApiEnv,
  input: CreateCashSaleRepositoryInput,
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `
        INSERT INTO ventas (
          id_venta,
          numero_venta,
          id_cliente,
          id_usuario,
          tipo_venta,
          subtotal,
          descuento,
          total,
          valor_pagado_inicial,
          saldo_pendiente,
          estado_venta,
          observaciones,
          actualizado_por,
          creado_en,
          actualizado_en
        ) VALUES (?, ?, ?, ?, 'CONTADO', ?, 0, ?, ?, 0, 'COMPLETADA', ?, ?, datetime('now'), datetime('now'))
      `,
    ).bind(
      input.idVenta,
      input.numeroVenta,
      input.idCliente,
      input.idUsuario,
      input.subtotal,
      input.total,
      input.total,
      input.observaciones,
      input.idUsuario,
    ),
    env.DB.prepare(
      `
        INSERT INTO pagos_ventas (
          id_pago_venta,
          id_venta,
          metodo_pago,
          valor_pagado,
          observaciones,
          id_usuario,
          estado_pago,
          creado_en
        ) VALUES (?, ?, ?, ?, 'Pago completo de venta de contado', ?, 'ACTIVO', datetime('now'))
      `,
    ).bind(input.idPagoVenta, input.idVenta, input.metodoPago, input.total, input.idUsuario),
  ];

  for (const detail of input.detalles) {
    statements.push(
      env.DB.prepare(
        `
          INSERT INTO detalle_ventas (
            id_detalle_venta,
            id_venta,
            id_variante,
            codigo_qr,
            nombre_producto,
            sku,
            talla,
            color,
            cantidad,
            precio_unitario,
            descuento,
            subtotal,
            creado_en
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))
        `,
      ).bind(
        detail.idDetalleVenta,
        input.idVenta,
        detail.idVariante,
        detail.codigoQr,
        detail.nombreProducto,
        detail.sku,
        detail.talla,
        detail.color,
        detail.cantidad,
        detail.precioUnitario,
        detail.subtotal,
      ),
    );

    statements.push(
      env.DB.prepare(
        `
          UPDATE variantes_producto
          SET stock_actual = stock_actual - ?,
              actualizado_en = datetime('now')
          WHERE id_variante = ?
            AND stock_actual >= ?
        `,
      ).bind(detail.cantidad, detail.idVariante, detail.cantidad),
    );

    statements.push(
      env.DB.prepare(
        `
          INSERT INTO movimientos_inventario (
            id_movimiento,
            id_variante,
            creado_por,
            tipo_movimiento,
            cantidad,
            stock_antes,
            stock_despues,
            motivo,
            referencia_tipo,
            referencia_id,
            creado_en
          )
          SELECT ?, ?, ?, 'VENTA', ?, ?, ?, 'Venta de contado', 'VENTA', ?, datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM variantes_producto
            WHERE id_variante = ?
              AND stock_actual = ?
          )
        `,
      ).bind(
        detail.idMovimiento,
        detail.idVariante,
        input.idUsuario,
        detail.cantidad,
        detail.stockAntes,
        detail.stockDespues,
        input.idVenta,
        detail.idVariante,
        detail.stockDespues,
      ),
    );
  }

  // D1 no expone transacciones manuales completas en el Worker como una conexion
  // tradicional. Batch reduce ventanas de inconsistencia y cada UPDATE protege
  // stock suficiente; luego el servicio verifica que todo haya quedado aplicado.
  await env.DB.batch(statements);
}

export async function getCashSalePersistenceStatus(
  env: ApiEnv,
  idVenta: string,
): Promise<CashSalePersistenceStatus> {
  const row = await env.DB.prepare(
    `
      SELECT
        EXISTS(SELECT 1 FROM ventas WHERE id_venta = ?) AS saleExists,
        EXISTS(SELECT 1 FROM pagos_ventas WHERE id_venta = ? AND estado_pago = 'ACTIVO') AS paymentExists,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE referencia_tipo = 'VENTA' AND referencia_id = ?) AS movementCount,
        (SELECT COUNT(*) FROM detalle_ventas WHERE id_venta = ?) AS detailsCount
    `,
  )
    .bind(idVenta, idVenta, idVenta, idVenta)
    .first<{
      saleExists: number;
      paymentExists: number;
      movementCount: number;
      detailsCount: number;
    }>();

  return {
    saleExists: Boolean(row?.saleExists),
    paymentExists: Boolean(row?.paymentExists),
    movementCount: row?.movementCount ?? 0,
    detailsCount: row?.detailsCount ?? 0,
  };
}

export async function listSales(env: ApiEnv, filters: ListSalesFilters): Promise<SaleListRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  applySaleFilters(where, values, filters);
  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${SALE_LIST_COLUMNS}
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
      LEFT JOIN detalle_ventas d ON d.id_venta = v.id_venta
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY v.id_venta
      ORDER BY v.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<SaleListRecord>();

  return result.results ?? [];
}

export async function findSaleById(env: ApiEnv, idVenta: string): Promise<SaleListRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${SALE_LIST_COLUMNS}
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
      LEFT JOIN detalle_ventas d ON d.id_venta = v.id_venta
      WHERE v.id_venta = ?
      GROUP BY v.id_venta
      LIMIT 1
    `,
  )
    .bind(idVenta)
    .first<SaleListRecord>();
}

export async function listSaleDetails(env: ApiEnv, idVenta: string): Promise<SaleDetailRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        id_detalle_venta,
        id_venta,
        id_variante,
        codigo_qr,
        nombre_producto,
        sku,
        talla,
        color,
        cantidad,
        precio_unitario,
        descuento,
        subtotal,
        creado_en
      FROM detalle_ventas
      WHERE id_venta = ?
      ORDER BY creado_en ASC
    `,
  )
    .bind(idVenta)
    .all<SaleDetailRecord>();

  return result.results ?? [];
}

export async function listSalePayments(env: ApiEnv, idVenta: string): Promise<SalePaymentRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        p.id_pago_venta,
        p.id_venta,
        p.metodo_pago,
        p.valor_pagado,
        p.referencia_pago,
        p.observaciones,
        p.creado_en,
        p.id_usuario,
        p.estado_pago,
        p.anulado_en,
        p.motivo_anulacion,
        u.nombre_completo AS usuario_nombre,
        u.correo AS usuario_correo
      FROM pagos_ventas p
      LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
      WHERE p.id_venta = ?
      ORDER BY p.creado_en ASC
    `,
  )
    .bind(idVenta)
    .all<SalePaymentRecord>();

  return result.results ?? [];
}

export async function getSaleDetailView(
  env: ApiEnv,
  idVenta: string,
): Promise<SaleDetailViewRecord | null> {
  const sale = await findSaleById(env, idVenta);

  if (!sale) return null;

  // Los detalles salen de detalle_ventas: son datos congelados de la venta, no
  // una lectura del catalogo actual. Asi cambios futuros de variante no alteran historial.
  const [detalles, pagos] = await Promise.all([
    listSaleDetails(env, idVenta),
    listSalePayments(env, idVenta),
  ]);

  return {
    ...sale,
    detalles,
    pagos,
  };
}

export async function cancelCashSale(
  env: ApiEnv,
  input: CancelCashSaleRepositoryInput,
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `
        UPDATE ventas
        SET estado_venta = 'ANULADA',
            anulado_por = ?,
            anulado_en = datetime('now'),
            motivo_anulacion = ?,
            actualizado_por = ?,
            actualizado_en = datetime('now')
        WHERE id_venta = ?
          AND tipo_venta = 'CONTADO'
          AND estado_venta = 'COMPLETADA'
      `,
    ).bind(input.idUsuario, input.motivoAnulacion, input.idUsuario, input.idVenta),
    env.DB.prepare(
      `
        UPDATE pagos_ventas
        SET estado_pago = 'ANULADO',
            anulado_por = ?,
            anulado_en = datetime('now'),
            motivo_anulacion = ?
        WHERE id_venta = ?
          AND estado_pago = 'ACTIVO'
      `,
    ).bind(input.idUsuario, input.motivoAnulacion, input.idVenta),
  ];

  for (const movement of input.movimientos) {
    statements.push(
      env.DB.prepare(
        `
          UPDATE variantes_producto
          SET stock_actual = stock_actual + ?,
              actualizado_en = datetime('now')
          WHERE id_variante = ?
            AND stock_actual = ?
        `,
      ).bind(movement.cantidad, movement.idVariante, movement.stockAntes),
    );

    statements.push(
      env.DB.prepare(
        `
          INSERT INTO movimientos_inventario (
            id_movimiento,
            id_variante,
            creado_por,
            tipo_movimiento,
            cantidad,
            stock_antes,
            stock_despues,
            motivo,
            referencia_tipo,
            referencia_id,
            creado_en
          )
          SELECT ?, ?, ?, 'ANULACION_VENTA', ?, ?, ?, ?, 'ANULACION_VENTA', ?, datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM variantes_producto
            WHERE id_variante = ?
              AND stock_actual = ?
          )
          AND EXISTS (
            SELECT 1
            FROM ventas
            WHERE id_venta = ?
              AND estado_venta = 'ANULADA'
          )
        `,
      ).bind(
        movement.idMovimiento,
        movement.idVariante,
        input.idUsuario,
        movement.cantidad,
        movement.stockAntes,
        movement.stockDespues,
        input.motivoAnulacion,
        input.idVenta,
        movement.idVariante,
        movement.stockDespues,
        input.idVenta,
      ),
    );
  }

  // Las ventas y pagos no se borran: se marcan como anulados para conservar
  // auditoria. Cada devolucion de stock crea movimiento ANULACION_VENTA.
  await env.DB.batch(statements);
}

export async function getCancellationPersistenceStatus(
  env: ApiEnv,
  idVenta: string,
): Promise<CancelSalePersistenceStatus> {
  const row = await env.DB.prepare(
    `
      SELECT
        EXISTS(SELECT 1 FROM ventas WHERE id_venta = ? AND estado_venta = 'ANULADA') AS saleCancelled,
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ? AND estado_pago = 'ACTIVO') AS activePaymentsCount,
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ? AND estado_pago = 'ANULADO') AS cancelledPaymentsCount,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE referencia_tipo = 'ANULACION_VENTA' AND referencia_id = ?) AS cancellationMovementCount
    `,
  )
    .bind(idVenta, idVenta, idVenta, idVenta)
    .first<{
      saleCancelled: number;
      activePaymentsCount: number;
      cancelledPaymentsCount: number;
      cancellationMovementCount: number;
    }>();

  return {
    saleCancelled: Boolean(row?.saleCancelled),
    activePaymentsCount: row?.activePaymentsCount ?? 0,
    cancelledPaymentsCount: row?.cancelledPaymentsCount ?? 0,
    cancellationMovementCount: row?.cancellationMovementCount ?? 0,
  };
}
