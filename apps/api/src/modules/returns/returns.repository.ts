import type { ApiEnv } from '../../config/env';
import type {
  CreateSaleReturnRepositoryInput,
  ReturnCreditActivityCounts,
  ReturnCreditRecord,
  ReturnSaleDetailAvailabilityRecord,
  ReturnSaleRecord,
  SaleReturnDetailRecord,
  SaleReturnPersistenceStatus,
  SaleReturnRecord,
  SaleReturnViewRecord,
  SaleReturnDetailToCreate,
} from './returns.types';

export async function findSaleForReturn(
  env: ApiEnv,
  idVenta: string,
): Promise<ReturnSaleRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_venta, tipo_venta, estado_venta
      FROM ventas
      WHERE id_venta = ?
      LIMIT 1
    `,
  )
    .bind(idVenta)
    .first<ReturnSaleRecord>();
}

export async function findDetailsForReturn(
  env: ApiEnv,
  idDetalleVentaList: string[],
): Promise<ReturnSaleDetailAvailabilityRecord[]> {
  if (idDetalleVentaList.length === 0) return [];

  const placeholders = idDetalleVentaList.map(() => '?').join(', ');
  const result = await env.DB.prepare(
    `
      SELECT
        d.id_detalle_venta,
        d.id_venta,
        d.id_variante,
        d.cantidad,
        d.precio_unitario,
        COALESCE(SUM(CASE
          WHEN dv.estado_devolucion = 'ACTIVA' THEN ddv.cantidad_devuelta
          ELSE 0
        END), 0) AS cantidad_devuelta_activa,
        v.stock_actual
      FROM detalle_ventas d
      INNER JOIN variantes_producto v ON v.id_variante = d.id_variante
      LEFT JOIN detalle_devoluciones_ventas ddv ON ddv.id_detalle_venta = d.id_detalle_venta
      LEFT JOIN devoluciones_ventas dv ON dv.id_devolucion = ddv.id_devolucion
      WHERE d.id_detalle_venta IN (${placeholders})
      GROUP BY d.id_detalle_venta
    `,
  )
    .bind(...idDetalleVentaList)
    .all<ReturnSaleDetailAvailabilityRecord>();

  return result.results ?? [];
}

export async function countSaleSideEffects(
  env: ApiEnv,
  idVenta: string,
): Promise<{
  paymentCount: number;
  creditCount: number;
  creditPaymentCount: number;
  creditAdjustmentCount: number;
}> {
  const row = await env.DB.prepare(
    `
      SELECT
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ?) AS paymentCount,
        (SELECT COUNT(*) FROM creditos_clientes WHERE id_venta = ?) AS creditCount,
        (
          SELECT COUNT(*)
          FROM abonos_creditos a
          INNER JOIN creditos_clientes cr ON cr.id_credito = a.id_credito
          WHERE cr.id_venta = ?
        ) AS creditPaymentCount,
        (
          SELECT COUNT(*)
          FROM ajustes_creditos aj
          INNER JOIN creditos_clientes cr ON cr.id_credito = aj.id_credito
          WHERE cr.id_venta = ?
        ) AS creditAdjustmentCount
    `,
  )
    .bind(idVenta, idVenta, idVenta, idVenta)
    .first<{
      paymentCount: number;
      creditCount: number;
      creditPaymentCount: number;
      creditAdjustmentCount: number;
    }>();

  return {
    paymentCount: row?.paymentCount ?? 0,
    creditCount: row?.creditCount ?? 0,
    creditPaymentCount: row?.creditPaymentCount ?? 0,
    creditAdjustmentCount: row?.creditAdjustmentCount ?? 0,
  };
}

export async function listCreditsForReturn(
  env: ApiEnv,
  idVenta: string,
): Promise<ReturnCreditRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        id_credito,
        id_venta,
        origen_credito,
        estado_credito,
        saldo_pendiente,
        monto_abonado
      FROM creditos_clientes
      WHERE id_venta = ?
    `,
  )
    .bind(idVenta)
    .all<ReturnCreditRecord>();

  return result.results ?? [];
}

export async function countCreditActivityForReturn(
  env: ApiEnv,
  idCredito: string,
): Promise<ReturnCreditActivityCounts> {
  const row = await env.DB.prepare(
    `
      SELECT
        (SELECT COUNT(*) FROM abonos_creditos WHERE id_credito = ?) AS paymentsCount,
        (SELECT COUNT(*) FROM ajustes_creditos WHERE id_credito = ?) AS adjustmentsCount
    `,
  )
    .bind(idCredito, idCredito)
    .first<ReturnCreditActivityCounts>();

  return {
    paymentsCount: row?.paymentsCount ?? 0,
    adjustmentsCount: row?.adjustmentsCount ?? 0,
  };
}

export async function createSaleReturn(
  env: ApiEnv,
  input: CreateSaleReturnRepositoryInput,
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `
        INSERT INTO devoluciones_ventas (
          id_devolucion,
          id_venta,
          tipo_venta,
          motivo,
          estado_devolucion,
          total_devuelto,
          impacto_credito,
          impacto_pago,
          creado_por,
          creado_en
        ) VALUES (?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?, datetime('now'))
      `,
    ).bind(
      input.idDevolucion,
      input.idVenta,
      input.tipoVenta,
      input.motivo,
      input.totalDevuelto,
      input.impactoCredito,
      input.impactoPago,
      input.creadoPor,
    ),
  ];

  for (const detail of input.detalles) {
    addDetailStatements(statements, env, input, detail);
  }

  if (input.creditUpdate) {
    statements.push(
      env.DB.prepare(
        `
          UPDATE creditos_clientes
          SET
            saldo_pendiente = ?,
            estado_credito = ?,
            actualizado_por = ?,
            actualizado_en = datetime('now')
          WHERE id_credito = ?
            AND id_venta = ?
            AND origen_credito = 'VENTA'
            AND estado_credito != 'ANULADO'
            AND saldo_pendiente = ?
            AND monto_abonado = ?
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
        `,
      ).bind(
        input.creditUpdate.saldoDespues,
        input.creditUpdate.estadoCredito,
        input.creadoPor,
        input.creditUpdate.idCredito,
        input.idVenta,
        input.creditUpdate.saldoAntes,
        input.creditUpdate.montoAbonado,
        input.creditUpdate.idCredito,
        input.creditUpdate.idCredito,
      ),
    );
  }

  await env.DB.batch(statements);
}

function addDetailStatements(
  statements: D1PreparedStatement[],
  env: ApiEnv,
  input: CreateSaleReturnRepositoryInput,
  detail: SaleReturnDetailToCreate,
): void {
  statements.push(
    env.DB.prepare(
      `
        UPDATE variantes_producto
        SET stock_actual = ?,
            actualizado_en = datetime('now')
        WHERE id_variante = ?
          AND stock_actual = ?
      `,
    ).bind(detail.stockDespues, detail.idVariante, detail.stockAntes),
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
        SELECT ?, ?, ?, 'DEVOLUCION', ?, ?, ?, ?, 'DEVOLUCION', ?, datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM devoluciones_ventas
          WHERE id_devolucion = ?
            AND estado_devolucion = 'ACTIVA'
        )
        AND EXISTS (
          SELECT 1
          FROM variantes_producto
          WHERE id_variante = ?
            AND stock_actual = ?
        )
      `,
    ).bind(
      detail.idMovimiento,
      detail.idVariante,
      input.creadoPor,
      detail.cantidadDevuelta,
      detail.stockAntes,
      detail.stockDespues,
      input.motivo,
      input.idDevolucion,
      input.idDevolucion,
      detail.idVariante,
      detail.stockDespues,
    ),
  );

  statements.push(
    env.DB.prepare(
      `
        INSERT INTO detalle_devoluciones_ventas (
          id_detalle_devolucion,
          id_devolucion,
          id_detalle_venta,
          id_variante,
          cantidad_devuelta,
          precio_unitario,
          subtotal_devuelto,
          stock_antes,
          stock_despues,
          id_movimiento,
          creado_en
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM movimientos_inventario
          WHERE id_movimiento = ?
            AND tipo_movimiento = 'DEVOLUCION'
            AND referencia_tipo = 'DEVOLUCION'
            AND referencia_id = ?
        )
        AND EXISTS (
          SELECT 1
          FROM detalle_ventas d
          WHERE d.id_detalle_venta = ?
            AND d.id_venta = ?
            AND d.id_variante = ?
            AND (
              d.cantidad - COALESCE((
                SELECT SUM(ddv.cantidad_devuelta)
                FROM detalle_devoluciones_ventas ddv
                INNER JOIN devoluciones_ventas dv ON dv.id_devolucion = ddv.id_devolucion
                WHERE ddv.id_detalle_venta = d.id_detalle_venta
                  AND dv.estado_devolucion = 'ACTIVA'
              ), 0)
            ) >= ?
        )
      `,
    ).bind(
      detail.idDetalleDevolucion,
      input.idDevolucion,
      detail.idDetalleVenta,
      detail.idVariante,
      detail.cantidadDevuelta,
      detail.precioUnitario,
      detail.subtotalDevuelto,
      detail.stockAntes,
      detail.stockDespues,
      detail.idMovimiento,
      detail.idMovimiento,
      input.idDevolucion,
      detail.idDetalleVenta,
      input.idVenta,
      detail.idVariante,
      detail.cantidadDevuelta,
    ),
  );
}

export async function getSaleReturnPersistenceStatus(
  env: ApiEnv,
  idVenta: string,
  idDevolucion: string,
  expectedStocks: Array<{ idVariante: string; stockDespues: number }>,
): Promise<SaleReturnPersistenceStatus> {
  const row = await env.DB.prepare(
    `
      SELECT
        EXISTS(
          SELECT 1
          FROM devoluciones_ventas
          WHERE id_devolucion = ?
            AND id_venta = ?
            AND estado_devolucion = 'ACTIVA'
        ) AS returnExists,
        (SELECT COUNT(*) FROM detalle_devoluciones_ventas WHERE id_devolucion = ?) AS detailsCount,
        (
          SELECT COUNT(*)
          FROM movimientos_inventario
          WHERE referencia_tipo = 'DEVOLUCION'
            AND referencia_id = ?
            AND tipo_movimiento = 'DEVOLUCION'
        ) AS movementCount,
        (SELECT estado_venta FROM ventas WHERE id_venta = ?) AS saleStatus,
        (SELECT COUNT(*) FROM pagos_ventas WHERE id_venta = ?) AS paymentCount,
        (SELECT COUNT(*) FROM creditos_clientes WHERE id_venta = ?) AS creditCount,
        (SELECT saldo_pendiente FROM creditos_clientes WHERE id_venta = ? LIMIT 1) AS creditSaldoPendiente,
        (SELECT monto_abonado FROM creditos_clientes WHERE id_venta = ? LIMIT 1) AS creditMontoAbonado,
        (SELECT estado_credito FROM creditos_clientes WHERE id_venta = ? LIMIT 1) AS creditEstado,
        (
          SELECT COUNT(*)
          FROM abonos_creditos a
          INNER JOIN creditos_clientes cr ON cr.id_credito = a.id_credito
          WHERE cr.id_venta = ?
        ) AS creditPaymentCount,
        (
          SELECT COUNT(*)
          FROM ajustes_creditos aj
          INNER JOIN creditos_clientes cr ON cr.id_credito = aj.id_credito
          WHERE cr.id_venta = ?
        ) AS creditAdjustmentCount
    `,
  )
    .bind(
      idDevolucion,
      idVenta,
      idDevolucion,
      idDevolucion,
      idVenta,
      idVenta,
      idVenta,
      idVenta,
      idVenta,
      idVenta,
      idVenta,
      idVenta,
    )
    .first<{
      returnExists: number;
      detailsCount: number;
      movementCount: number;
      saleStatus: SaleReturnPersistenceStatus['saleStatus'];
      paymentCount: number;
      creditCount: number;
      creditSaldoPendiente: number | null;
      creditMontoAbonado: number | null;
      creditEstado: SaleReturnPersistenceStatus['creditEstado'];
      creditPaymentCount: number;
      creditAdjustmentCount: number;
    }>();

  const stockMatches = await Promise.all(
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
    returnExists: Boolean(row?.returnExists),
    detailsCount: row?.detailsCount ?? 0,
    movementCount: row?.movementCount ?? 0,
    stockMatchesCount: stockMatches.filter((item) => Boolean(item?.stockMatches)).length,
    saleStatus: row?.saleStatus ?? null,
    paymentCount: row?.paymentCount ?? 0,
    creditCount: row?.creditCount ?? 0,
    creditSaldoPendiente: row?.creditSaldoPendiente ?? null,
    creditMontoAbonado: row?.creditMontoAbonado ?? null,
    creditEstado: row?.creditEstado ?? null,
    creditPaymentCount: row?.creditPaymentCount ?? 0,
    creditAdjustmentCount: row?.creditAdjustmentCount ?? 0,
  };
}

export async function listSaleReturns(
  env: ApiEnv,
  idVenta: string,
): Promise<SaleReturnViewRecord[]> {
  const returns = await env.DB.prepare(
    `
      SELECT
        dv.id_devolucion,
        dv.id_venta,
        dv.tipo_venta,
        dv.motivo,
        dv.estado_devolucion,
        dv.total_devuelto,
        dv.impacto_credito,
        dv.impacto_pago,
        dv.creado_por,
        dv.creado_en,
        dv.anulado_por,
        dv.anulado_en,
        dv.motivo_anulacion,
        u.nombre_completo AS creado_por_nombre,
        u.correo AS creado_por_correo
      FROM devoluciones_ventas dv
      INNER JOIN usuarios u ON u.id_usuario = dv.creado_por
      WHERE dv.id_venta = ?
      ORDER BY dv.creado_en DESC
    `,
  )
    .bind(idVenta)
    .all<SaleReturnRecord>();

  const rows = returns.results ?? [];

  return Promise.all(
    rows.map(async (saleReturn) => ({
      ...saleReturn,
      detalles: await listSaleReturnDetails(env, saleReturn.id_devolucion),
    })),
  );
}

async function listSaleReturnDetails(
  env: ApiEnv,
  idDevolucion: string,
): Promise<SaleReturnDetailRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        id_detalle_devolucion,
        id_devolucion,
        id_detalle_venta,
        id_variante,
        cantidad_devuelta,
        precio_unitario,
        subtotal_devuelto,
        stock_antes,
        stock_despues,
        id_movimiento,
        creado_en
      FROM detalle_devoluciones_ventas
      WHERE id_devolucion = ?
      ORDER BY creado_en ASC
    `,
  )
    .bind(idDevolucion)
    .all<SaleReturnDetailRecord>();

  return result.results ?? [];
}
