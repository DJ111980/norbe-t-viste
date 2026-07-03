import type { ApiEnv } from '../../config/env';
import type {
  CashSalePersistenceStatus,
  CancelSalePersistenceStatus,
  CancelSaleRepositoryInput,
  CreateCashSaleRepositoryInput,
  CreateCreditSaleRepositoryInput,
  CreateMixedSaleRepositoryInput,
  CreditSalePersistenceStatus,
  ListSalesFilters,
  MixedSalePersistenceStatus,
  SaleClientRecord,
  SaleCreditRecord,
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
  v.anulado_por,
  v.anulado_en,
  v.motivo_anulacion,
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

export async function createCreditSale(
  env: ApiEnv,
  input: CreateCreditSaleRepositoryInput,
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
        ) VALUES (?, ?, ?, ?, 'CREDITO', ?, 0, ?, 0, ?, 'COMPLETADA', ?, ?, datetime('now'), datetime('now'))
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
        INSERT INTO creditos_clientes (
          id_credito,
          id_cliente,
          id_venta,
          id_usuario,
          origen_credito,
          tipo_deuda_antigua,
          descripcion_credito,
          monto_inicial,
          monto_abonado,
          saldo_pendiente,
          fecha_credito,
          estado_credito,
          observaciones,
          actualizado_por,
          creado_en,
          actualizado_en
        )
        SELECT ?, ?, ?, ?, 'VENTA', NULL, ?, ?, 0, ?, datetime('now'), 'PENDIENTE', ?, ?, datetime('now'), datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM ventas
          WHERE id_venta = ?
            AND tipo_venta = 'CREDITO'
            AND saldo_pendiente = ?
        )
      `,
    ).bind(
      input.idCredito,
      input.idCliente,
      input.idVenta,
      input.idUsuario,
      'Venta a credito',
      input.total,
      input.total,
      input.observaciones,
      input.idUsuario,
      input.idVenta,
      input.total,
    ),
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
          SELECT ?, ?, ?, 'VENTA', ?, ?, ?, 'Venta a credito', 'VENTA', ?, datetime('now')
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
              AND tipo_venta = 'CREDITO'
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
        input.idVenta,
      ),
    );

    statements.push(
      env.DB.prepare(
        `
          INSERT INTO detalle_creditos (
            id_detalle_credito,
            id_credito,
            id_variante,
            nombre_producto,
            sku,
            talla,
            color,
            cantidad,
            precio_unitario,
            subtotal,
            observaciones,
            creado_en
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Detalle creado desde venta a credito', datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM creditos_clientes
            WHERE id_credito = ?
              AND id_venta = ?
              AND origen_credito = 'VENTA'
          )
        `,
      ).bind(
        `credet_${detail.idDetalleVenta}`,
        input.idCredito,
        detail.idVariante,
        detail.nombreProducto,
        detail.sku,
        detail.talla,
        detail.color,
        detail.cantidad,
        detail.precioUnitario,
        detail.subtotal,
        input.idCredito,
        input.idVenta,
      ),
    );
  }

  // La venta a credito descuenta stock igual que contado porque el producto sale
  // del inventario en el momento de entrega. No se crean pagos ni abonos: la
  // deuda queda en creditos_clientes para cobrarse en fases posteriores.
  await env.DB.batch(statements);
}

export async function getCreditSalePersistenceStatus(
  env: ApiEnv,
  idVenta: string,
  idCredito: string,
  expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
): Promise<CreditSalePersistenceStatus> {
  const row = await env.DB.prepare(
    `
      SELECT
        EXISTS(SELECT 1 FROM ventas WHERE id_venta = ? AND tipo_venta = 'CREDITO') AS saleExists,
        EXISTS(SELECT 1 FROM creditos_clientes WHERE id_credito = ? AND id_venta = ? AND origen_credito = 'VENTA') AS creditExists,
        EXISTS(SELECT 1 FROM pagos_ventas WHERE id_venta = ?) AS paymentExists,
        EXISTS(SELECT 1 FROM abonos_creditos WHERE id_credito = ?) AS creditPaymentExists,
        EXISTS(SELECT 1 FROM ajustes_creditos WHERE id_credito = ?) AS creditAdjustmentExists,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE referencia_tipo = 'VENTA' AND referencia_id = ?) AS movementCount,
        (SELECT COUNT(*) FROM detalle_ventas WHERE id_venta = ?) AS detailsCount,
        (SELECT COUNT(*) FROM detalle_creditos WHERE id_credito = ?) AS creditDetailsCount
    `,
  )
    .bind(idVenta, idCredito, idVenta, idVenta, idCredito, idCredito, idVenta, idVenta, idCredito)
    .first<{
      saleExists: number;
      creditExists: number;
      paymentExists: number;
      creditPaymentExists: number;
      creditAdjustmentExists: number;
      movementCount: number;
      detailsCount: number;
      creditDetailsCount: number;
    }>();

  const stockMatchesCount = await Promise.all(
    expectedStocks.map((stock) =>
      env.DB.prepare(
        `
          SELECT EXISTS(
            SELECT 1
            FROM variantes_producto
            WHERE id_variante = ?
              AND stock_actual = ?
          ) AS stockMatches
        `,
      )
        .bind(stock.idVariante, stock.stockDespues)
        .first<{ stockMatches: number }>(),
    ),
  );

  return {
    saleExists: Boolean(row?.saleExists),
    creditExists: Boolean(row?.creditExists),
    paymentExists: Boolean(row?.paymentExists),
    creditPaymentExists: Boolean(row?.creditPaymentExists),
    creditAdjustmentExists: Boolean(row?.creditAdjustmentExists),
    movementCount: row?.movementCount ?? 0,
    detailsCount: row?.detailsCount ?? 0,
    creditDetailsCount: row?.creditDetailsCount ?? 0,
    stockMatchesCount: stockMatchesCount.filter((item) => Boolean(item?.stockMatches)).length,
  };
}

export async function createMixedSale(
  env: ApiEnv,
  input: CreateMixedSaleRepositoryInput,
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
        ) VALUES (?, ?, ?, ?, 'MIXTA', ?, 0, ?, ?, ?, 'COMPLETADA', ?, ?, datetime('now'), datetime('now'))
      `,
    ).bind(
      input.idVenta,
      input.numeroVenta,
      input.idCliente,
      input.idUsuario,
      input.subtotal,
      input.total,
      input.valorPagadoInicial,
      input.saldoCredito,
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
        )
        SELECT ?, ?, ?, ?, 'Pago inicial de venta mixta', ?, 'ACTIVO', datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM ventas
          WHERE id_venta = ?
            AND tipo_venta = 'MIXTA'
            AND valor_pagado_inicial = ?
        )
      `,
    ).bind(
      input.idPagoVenta,
      input.idVenta,
      input.metodoPago,
      input.valorPagadoInicial,
      input.idUsuario,
      input.idVenta,
      input.valorPagadoInicial,
    ),
    env.DB.prepare(
      `
        INSERT INTO creditos_clientes (
          id_credito,
          id_cliente,
          id_venta,
          id_usuario,
          origen_credito,
          tipo_deuda_antigua,
          descripcion_credito,
          monto_inicial,
          monto_abonado,
          saldo_pendiente,
          fecha_credito,
          estado_credito,
          observaciones,
          actualizado_por,
          creado_en,
          actualizado_en
        )
        SELECT ?, ?, ?, ?, 'VENTA', NULL, ?, ?, 0, ?, datetime('now'), 'PENDIENTE', ?, ?, datetime('now'), datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM ventas
          WHERE id_venta = ?
            AND tipo_venta = 'MIXTA'
            AND saldo_pendiente = ?
        )
      `,
    ).bind(
      input.idCredito,
      input.idCliente,
      input.idVenta,
      input.idUsuario,
      'Saldo restante de venta mixta',
      input.saldoCredito,
      input.saldoCredito,
      input.observaciones,
      input.idUsuario,
      input.idVenta,
      input.saldoCredito,
    ),
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
          SELECT ?, ?, ?, 'VENTA', ?, ?, ?, 'Venta mixta', 'VENTA', ?, datetime('now')
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
              AND tipo_venta = 'MIXTA'
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
        input.idVenta,
      ),
    );

    statements.push(
      env.DB.prepare(
        `
          INSERT INTO detalle_creditos (
            id_detalle_credito,
            id_credito,
            id_variante,
            nombre_producto,
            sku,
            talla,
            color,
            cantidad,
            precio_unitario,
            subtotal,
            observaciones,
            creado_en
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Detalle creado desde venta mixta', datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM creditos_clientes
            WHERE id_credito = ?
              AND id_venta = ?
              AND origen_credito = 'VENTA'
          )
        `,
      ).bind(
        `credet_${detail.idDetalleVenta}`,
        input.idCredito,
        detail.idVariante,
        detail.nombreProducto,
        detail.sku,
        detail.talla,
        detail.color,
        detail.cantidad,
        detail.precioUnitario,
        detail.subtotal,
        input.idCredito,
        input.idVenta,
      ),
    );
  }

  // En MIXTA el pago inicial vive en pagos_ventas y no es abono al credito.
  // El credito nace solo por el saldo restante; la anulacion de este flujo se
  // implementara aparte porque debe coordinar pago, credito y stock.
  await env.DB.batch(statements);
}

export async function getMixedSalePersistenceStatus(
  env: ApiEnv,
  idVenta: string,
  idCredito: string,
  expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
): Promise<MixedSalePersistenceStatus> {
  const row = await env.DB.prepare(
    `
      SELECT
        EXISTS(SELECT 1 FROM ventas WHERE id_venta = ? AND tipo_venta = 'MIXTA') AS saleExists,
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ? AND estado_pago = 'ACTIVO') AS paymentCount,
        EXISTS(SELECT 1 FROM creditos_clientes WHERE id_credito = ? AND id_venta = ? AND origen_credito = 'VENTA') AS creditExists,
        (SELECT monto_inicial FROM creditos_clientes WHERE id_credito = ?) AS creditInitialAmount,
        (SELECT monto_abonado FROM creditos_clientes WHERE id_credito = ?) AS creditPaidAmount,
        (SELECT saldo_pendiente FROM creditos_clientes WHERE id_credito = ?) AS creditBalance,
        (SELECT estado_credito FROM creditos_clientes WHERE id_credito = ?) AS creditStatus,
        EXISTS(SELECT 1 FROM abonos_creditos WHERE id_credito = ?) AS creditPaymentExists,
        EXISTS(SELECT 1 FROM ajustes_creditos WHERE id_credito = ?) AS creditAdjustmentExists,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE referencia_tipo = 'VENTA' AND referencia_id = ?) AS movementCount,
        (SELECT COUNT(*) FROM detalle_ventas WHERE id_venta = ?) AS detailsCount,
        (SELECT COUNT(*) FROM detalle_creditos WHERE id_credito = ?) AS creditDetailsCount
    `,
  )
    .bind(
      idVenta,
      idVenta,
      idCredito,
      idVenta,
      idCredito,
      idCredito,
      idCredito,
      idCredito,
      idCredito,
      idCredito,
      idVenta,
      idVenta,
      idCredito,
    )
    .first<{
      saleExists: number;
      paymentCount: number;
      creditExists: number;
      creditInitialAmount: number | null;
      creditPaidAmount: number | null;
      creditBalance: number | null;
      creditStatus: string | null;
      creditPaymentExists: number;
      creditAdjustmentExists: number;
      movementCount: number;
      detailsCount: number;
      creditDetailsCount: number;
    }>();

  const stockMatchesCount = await Promise.all(
    expectedStocks.map((stock) =>
      env.DB.prepare(
        `
          SELECT EXISTS(
            SELECT 1
            FROM variantes_producto
            WHERE id_variante = ?
              AND stock_actual = ?
          ) AS stockMatches
        `,
      )
        .bind(stock.idVariante, stock.stockDespues)
        .first<{ stockMatches: number }>(),
    ),
  );

  return {
    saleExists: Boolean(row?.saleExists),
    paymentCount: row?.paymentCount ?? 0,
    creditExists: Boolean(row?.creditExists),
    creditInitialAmount: row?.creditInitialAmount ?? null,
    creditPaidAmount: row?.creditPaidAmount ?? null,
    creditBalance: row?.creditBalance ?? null,
    creditStatus: row?.creditStatus ?? null,
    creditPaymentExists: Boolean(row?.creditPaymentExists),
    creditAdjustmentExists: Boolean(row?.creditAdjustmentExists),
    movementCount: row?.movementCount ?? 0,
    detailsCount: row?.detailsCount ?? 0,
    creditDetailsCount: row?.creditDetailsCount ?? 0,
    stockMatchesCount: stockMatchesCount.filter((item) => Boolean(item?.stockMatches)).length,
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

export async function listSaleCredits(env: ApiEnv, idVenta: string): Promise<SaleCreditRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        id_credito,
        id_cliente,
        id_venta,
        origen_credito,
        monto_inicial,
        monto_abonado,
        saldo_pendiente,
        estado_credito
      FROM creditos_clientes
      WHERE id_venta = ?
        AND origen_credito = 'VENTA'
      ORDER BY creado_en ASC
    `,
  )
    .bind(idVenta)
    .all<SaleCreditRecord>();

  return result.results ?? [];
}

export async function creditHasPayments(env: ApiEnv, idCredito: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `
      SELECT EXISTS(
        SELECT 1
        FROM abonos_creditos
        WHERE id_credito = ?
      ) AS existsRecord
    `,
  )
    .bind(idCredito)
    .first<{ existsRecord: number }>();

  return Boolean(row?.existsRecord);
}

export async function creditHasAdjustments(env: ApiEnv, idCredito: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `
      SELECT EXISTS(
        SELECT 1
        FROM ajustes_creditos
        WHERE id_credito = ?
      ) AS existsRecord
    `,
  )
    .bind(idCredito)
    .first<{ existsRecord: number }>();

  return Boolean(row?.existsRecord);
}

export async function cancelSale(env: ApiEnv, input: CancelSaleRepositoryInput): Promise<void> {
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
          AND tipo_venta = ?
          AND estado_venta = 'COMPLETADA'
      `,
    ).bind(input.idUsuario, input.motivoAnulacion, input.idUsuario, input.idVenta, input.tipoVenta),
  ];

  if (input.tipoVenta === 'CONTADO' || input.tipoVenta === 'MIXTA') {
    statements.push(
      env.DB.prepare(
        `
          UPDATE pagos_ventas
          SET estado_pago = 'ANULADO',
              anulado_por = ?,
              anulado_en = datetime('now'),
              motivo_anulacion = ?
          WHERE id_venta = ?
            AND estado_pago = 'ACTIVO'
            AND EXISTS (
              SELECT 1
              FROM ventas
              WHERE id_venta = ?
                AND estado_venta = 'ANULADA'
            )
        `,
      ).bind(input.idUsuario, input.motivoAnulacion, input.idVenta, input.idVenta),
    );
  }

  if (input.idCredito) {
    statements.push(
      env.DB.prepare(
        `
          UPDATE creditos_clientes
          SET estado_credito = 'ANULADO',
              saldo_pendiente = 0,
              anulado_por = ?,
              anulado_en = datetime('now'),
              motivo_anulacion = ?,
              actualizado_por = ?,
              actualizado_en = datetime('now')
          WHERE id_credito = ?
            AND id_venta = ?
            AND origen_credito = 'VENTA'
            AND estado_credito = 'PENDIENTE'
            AND monto_abonado = 0
            AND saldo_pendiente = monto_inicial
            AND NOT EXISTS (
              SELECT 1
              FROM abonos_creditos
              WHERE id_credito = ?
            )
            AND NOT EXISTS (
              SELECT 1
              FROM ajustes_creditos
              WHERE id_credito = ?
            )
            AND EXISTS (
              SELECT 1
              FROM ventas
              WHERE id_venta = ?
                AND estado_venta = 'ANULADA'
            )
        `,
      ).bind(
        input.idUsuario,
        input.motivoAnulacion,
        input.idUsuario,
        input.idCredito,
        input.idVenta,
        input.idCredito,
        input.idCredito,
        input.idVenta,
      ),
    );
  }

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

  // Las ventas, pagos y creditos no se borran: se marcan como anulados para
  // conservar auditoria. Cada devolucion de stock crea movimiento ANULACION_VENTA
  // porque el stock real vive en variantes_producto y debe quedar explicado.
  await env.DB.batch(statements);
}

export async function getCancellationPersistenceStatus(
  env: ApiEnv,
  idVenta: string,
  tipoVenta: SaleListRecord['tipo_venta'],
  expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
  idCredito?: string,
): Promise<CancelSalePersistenceStatus> {
  const row = await env.DB.prepare(
    `
      SELECT
        EXISTS(SELECT 1 FROM ventas WHERE id_venta = ? AND estado_venta = 'ANULADA') AS saleCancelled,
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ? AND estado_pago = 'ACTIVO') AS activePaymentsCount,
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ? AND estado_pago = 'ANULADO') AS cancelledPaymentsCount,
        EXISTS(SELECT 1 FROM creditos_clientes WHERE id_credito = ? AND estado_credito = 'ANULADO') AS creditCancelled,
        (SELECT saldo_pendiente FROM creditos_clientes WHERE id_credito = ?) AS creditBalance,
        EXISTS(SELECT 1 FROM abonos_creditos WHERE id_credito = ?) AS creditPaymentExists,
        EXISTS(SELECT 1 FROM ajustes_creditos WHERE id_credito = ?) AS creditAdjustmentExists,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE referencia_tipo = 'ANULACION_VENTA' AND referencia_id = ?) AS cancellationMovementCount
    `,
  )
    .bind(
      idVenta,
      idVenta,
      idVenta,
      idCredito ?? null,
      idCredito ?? null,
      idCredito ?? null,
      idCredito ?? null,
      idVenta,
    )
    .first<{
      saleCancelled: number;
      activePaymentsCount: number;
      cancelledPaymentsCount: number;
      creditCancelled: number;
      creditBalance: number | null;
      creditPaymentExists: number;
      creditAdjustmentExists: number;
      cancellationMovementCount: number;
    }>();

  const stockMatchesCount = await Promise.all(
    expectedStocks.map((stock) =>
      env.DB.prepare(
        `
          SELECT EXISTS(
            SELECT 1
            FROM variantes_producto
            WHERE id_variante = ?
              AND stock_actual = ?
          ) AS stockMatches
        `,
      )
        .bind(stock.idVariante, stock.stockDespues)
        .first<{ stockMatches: number }>(),
    ),
  );

  return {
    saleCancelled: Boolean(row?.saleCancelled),
    activePaymentsCount: row?.activePaymentsCount ?? 0,
    cancelledPaymentsCount: row?.cancelledPaymentsCount ?? 0,
    creditCancelled: tipoVenta === 'CONTADO' ? true : Boolean(row?.creditCancelled),
    creditBalance: row?.creditBalance ?? null,
    creditPaymentExists: Boolean(row?.creditPaymentExists),
    creditAdjustmentExists: Boolean(row?.creditAdjustmentExists),
    cancellationMovementCount: row?.cancellationMovementCount ?? 0,
    stockMatchesCount: stockMatchesCount.filter((item) => Boolean(item?.stockMatches)).length,
  };
}
