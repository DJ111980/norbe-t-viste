import type { ApiEnv } from '../../config/env';
import type {
  CancelCreditRepositoryInput,
  CancelCreditPaymentRepositoryInput,
  CreateCreditAdjustmentRepositoryInput,
  CreateCreditPaymentRepositoryInput,
  CreateOldDebtInput,
  CreditAdjustmentPersistenceStatus,
  CreditAdjustmentRecord,
  CreditClientRecord,
  CreditDetailRecord,
  CreditDetailViewRecord,
  CreditPaymentPersistenceStatus,
  CreditPaymentCancellationPersistenceStatus,
  CreditActivityCounts,
  CreditCancellationPersistenceStatus,
  CreditPaymentRecord,
  CreditRecord,
  CreditSaleRecord,
  ListClientCreditsFilters,
  ListCreditsFilters,
} from './credits.types';

const CREDIT_COLUMNS = `
  cr.id_credito,
  cr.id_cliente,
  cr.id_venta,
  cr.id_usuario,
  cr.origen_credito,
  cr.tipo_deuda_antigua,
  cr.descripcion_credito,
  cr.monto_inicial,
  cr.monto_abonado,
  cr.saldo_pendiente,
  cr.fecha_credito,
  cr.fecha_vencimiento,
  cr.estado_credito,
  cr.observaciones,
  cr.creado_en,
  cr.actualizado_en,
  cr.actualizado_por,
  cr.anulado_por,
  cr.anulado_en,
  cr.motivo_anulacion,
  c.nombre_completo AS cliente_nombre,
  c.documento AS cliente_documento,
  c.telefono AS cliente_telefono
`;

function applyCreditFilters(
  where: string[],
  values: (string | number)[],
  filters: ListCreditsFilters | ListClientCreditsFilters,
): void {
  if ('cliente' in filters && filters.cliente) {
    where.push('cr.id_cliente = ?');
    values.push(filters.cliente);
  }
  if (filters.estado) {
    where.push('cr.estado_credito = ?');
    values.push(filters.estado);
  }
  if (filters.origenCredito) {
    where.push('cr.origen_credito = ?');
    values.push(filters.origenCredito);
  }
  if (filters.saldoPendiente !== undefined) {
    where.push(filters.saldoPendiente ? 'cr.saldo_pendiente > 0' : 'cr.saldo_pendiente = 0');
  }
  if ('fechaDesde' in filters && filters.fechaDesde) {
    where.push('cr.fecha_credito >= ?');
    values.push(filters.fechaDesde);
  }
  if ('fechaHasta' in filters && filters.fechaHasta) {
    where.push('cr.fecha_credito <= ?');
    values.push(filters.fechaHasta);
  }
}

export async function findClientForCredit(
  env: ApiEnv,
  idCliente: string,
): Promise<CreditClientRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_cliente, nombre_completo, documento, telefono, estado
      FROM clientes
      WHERE id_cliente = ?
      LIMIT 1
    `,
  )
    .bind(idCliente)
    .first<CreditClientRecord>();
}

export async function listCredits(
  env: ApiEnv,
  filters: ListCreditsFilters,
): Promise<CreditRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  applyCreditFilters(where, values, filters);
  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${CREDIT_COLUMNS}
      FROM creditos_clientes cr
      INNER JOIN clientes c ON c.id_cliente = cr.id_cliente
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY cr.fecha_credito DESC, cr.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<CreditRecord>();

  return result.results ?? [];
}

export async function listCreditsByClient(
  env: ApiEnv,
  idCliente: string,
  filters: ListClientCreditsFilters,
): Promise<CreditRecord[]> {
  const where = ['cr.id_cliente = ?'];
  const values: (string | number)[] = [idCliente];

  applyCreditFilters(where, values, filters);
  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${CREDIT_COLUMNS}
      FROM creditos_clientes cr
      INNER JOIN clientes c ON c.id_cliente = cr.id_cliente
      WHERE ${where.join(' AND ')}
      ORDER BY cr.fecha_credito DESC, cr.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<CreditRecord>();

  return result.results ?? [];
}

export async function findCreditById(env: ApiEnv, idCredito: string): Promise<CreditRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${CREDIT_COLUMNS}
      FROM creditos_clientes cr
      INNER JOIN clientes c ON c.id_cliente = cr.id_cliente
      WHERE cr.id_credito = ?
      LIMIT 1
    `,
  )
    .bind(idCredito)
    .first<CreditRecord>();
}

export async function findSaleForCredit(
  env: ApiEnv,
  idVenta: string | null,
): Promise<CreditSaleRecord | null> {
  if (!idVenta) return null;

  return env.DB.prepare(
    `
      SELECT id_venta, numero_venta, tipo_venta, estado_venta, total, saldo_pendiente
      FROM ventas
      WHERE id_venta = ?
      LIMIT 1
    `,
  )
    .bind(idVenta)
    .first<CreditSaleRecord>();
}

export async function listCreditDetails(
  env: ApiEnv,
  idCredito: string,
): Promise<CreditDetailRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        id_detalle_credito,
        id_credito,
        id_variante,
        nombre_producto,
        talla,
        color,
        cantidad,
        precio_unitario,
        subtotal,
        observaciones,
        creado_en
      FROM detalle_creditos
      WHERE id_credito = ?
      ORDER BY creado_en ASC
    `,
  )
    .bind(idCredito)
    .all<CreditDetailRecord>();

  return result.results ?? [];
}

export async function listCreditPayments(
  env: ApiEnv,
  idCredito: string,
): Promise<CreditPaymentRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        a.id_abono,
        a.id_credito,
        a.id_cliente,
        a.id_usuario,
        a.valor_abono,
        a.metodo_pago,
        a.referencia_pago,
        a.fecha_abono,
        a.observaciones,
        a.creado_en,
        a.estado_abono,
        a.anulado_en,
        a.motivo_anulacion,
        u.nombre_completo AS usuario_nombre
      FROM abonos_creditos a
      INNER JOIN usuarios u ON u.id_usuario = a.id_usuario
      WHERE a.id_credito = ?
      ORDER BY a.fecha_abono ASC, a.creado_en ASC
    `,
  )
    .bind(idCredito)
    .all<CreditPaymentRecord>();

  return result.results ?? [];
}

export async function findCreditPaymentById(
  env: ApiEnv,
  idAbono: string,
): Promise<CreditPaymentRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        a.id_abono,
        a.id_credito,
        a.id_cliente,
        a.id_usuario,
        a.valor_abono,
        a.metodo_pago,
        a.referencia_pago,
        a.fecha_abono,
        a.observaciones,
        a.creado_en,
        a.estado_abono,
        a.anulado_en,
        a.motivo_anulacion,
        u.nombre_completo AS usuario_nombre
      FROM abonos_creditos a
      INNER JOIN usuarios u ON u.id_usuario = a.id_usuario
      WHERE a.id_abono = ?
      LIMIT 1
    `,
  )
    .bind(idAbono)
    .first<CreditPaymentRecord>();
}

export async function listCreditAdjustments(
  env: ApiEnv,
  idCredito: string,
): Promise<CreditAdjustmentRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT
        aj.id_ajuste,
        aj.id_credito,
        aj.id_usuario,
        aj.tipo_ajuste,
        aj.valor_ajuste,
        aj.saldo_antes,
        aj.saldo_despues,
        aj.motivo,
        aj.creado_en,
        u.nombre_completo AS usuario_nombre
      FROM ajustes_creditos aj
      INNER JOIN usuarios u ON u.id_usuario = aj.id_usuario
      WHERE aj.id_credito = ?
      ORDER BY aj.creado_en ASC
    `,
  )
    .bind(idCredito)
    .all<CreditAdjustmentRecord>();

  return result.results ?? [];
}

export async function getCreditDetailView(
  env: ApiEnv,
  idCredito: string,
): Promise<CreditDetailViewRecord | null> {
  const credit = await findCreditById(env, idCredito);

  if (!credit) return null;

  const [venta, detalles, abonos, ajustes] = await Promise.all([
    findSaleForCredit(env, credit.id_venta),
    listCreditDetails(env, idCredito),
    listCreditPayments(env, idCredito),
    listCreditAdjustments(env, idCredito),
  ]);

  return {
    ...credit,
    venta,
    detalles,
    abonos,
    ajustes,
  };
}

export async function countCreditActivity(
  env: ApiEnv,
  idCredito: string,
): Promise<CreditActivityCounts> {
  const counts = await env.DB.prepare(
    `
      SELECT
        (SELECT COUNT(*) FROM abonos_creditos WHERE id_credito = ?) AS paymentsCount,
        (SELECT COUNT(*) FROM ajustes_creditos WHERE id_credito = ?) AS adjustmentsCount
    `,
  )
    .bind(idCredito, idCredito)
    .first<CreditActivityCounts>();

  return {
    paymentsCount: counts?.paymentsCount ?? 0,
    adjustmentsCount: counts?.adjustmentsCount ?? 0,
  };
}

export async function createOldDebtCredit(
  env: ApiEnv,
  idCredito: string,
  input: CreateOldDebtInput,
  userId: string,
): Promise<CreditRecord> {
  await env.DB.prepare(
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
      ) VALUES (?, ?, NULL, ?, 'DEUDA_ANTIGUA', ?, ?, ?, 0, ?, datetime('now'), 'PENDIENTE', ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idCredito,
      input.idCliente,
      userId,
      input.tipoDeudaAntigua,
      input.descripcion,
      input.montoInicial,
      input.montoInicial,
      input.descripcion,
      userId,
    )
    .run();

  return (await findCreditById(env, idCredito)) as CreditRecord;
}

export async function cancelCredit(env: ApiEnv, input: CancelCreditRepositoryInput): Promise<void> {
  // Esta anulacion directa solo aplica a deudas antiguas limpias. Las guardas
  // SQL protegen contra doble anulacion, creditos de venta y actividad previa.
  await env.DB.batch([
    env.DB.prepare(
      `
        UPDATE creditos_clientes
        SET
          estado_credito = 'ANULADO',
          saldo_pendiente = 0,
          anulado_por = ?,
          anulado_en = datetime('now'),
          motivo_anulacion = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
        WHERE id_credito = ?
          AND estado_credito != 'ANULADO'
          AND origen_credito = 'DEUDA_ANTIGUA'
          AND id_venta IS NULL
          AND saldo_pendiente = ?
          AND monto_inicial = ?
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
      input.idUsuario,
      input.motivoAnulacion,
      input.idUsuario,
      input.idCredito,
      input.saldoAnterior,
      input.montoInicial,
      input.montoAbonado,
      input.idCredito,
      input.idCredito,
    ),
  ]);
}

export async function getCreditCancellationPersistenceStatus(
  env: ApiEnv,
  idCredito: string,
): Promise<CreditCancellationPersistenceStatus> {
  const status = await env.DB.prepare(
    `
      SELECT
        saldo_pendiente AS creditSaldoPendiente,
        monto_inicial AS creditMontoInicial,
        monto_abonado AS creditMontoAbonado,
        estado_credito AS creditEstado,
        anulado_por AS creditCancelledBy,
        anulado_en AS creditCancelledAt,
        motivo_anulacion AS creditCancellationReason
      FROM creditos_clientes
      WHERE id_credito = ?
      LIMIT 1
    `,
  )
    .bind(idCredito)
    .first<CreditCancellationPersistenceStatus>();

  return {
    creditSaldoPendiente: status?.creditSaldoPendiente ?? null,
    creditMontoInicial: status?.creditMontoInicial ?? null,
    creditMontoAbonado: status?.creditMontoAbonado ?? null,
    creditEstado: status?.creditEstado ?? null,
    creditCancelledBy: status?.creditCancelledBy ?? null,
    creditCancelledAt: status?.creditCancelledAt ?? null,
    creditCancellationReason: status?.creditCancellationReason ?? null,
  };
}

export async function createCreditPayment(
  env: ApiEnv,
  input: CreateCreditPaymentRepositoryInput,
): Promise<void> {
  // El abono y el saldo del credito se actualizan en el mismo batch para evitar
  // registrar pagos sin reflejar la cartera. La guarda de saldo impide sobreabonos
  // si dos solicitudes intentan pagar el mismo credito al mismo tiempo.
  await env.DB.batch([
    env.DB.prepare(
      `
        UPDATE creditos_clientes
        SET
          monto_abonado = monto_abonado + ?,
          saldo_pendiente = saldo_pendiente - ?,
          estado_credito = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
        WHERE id_credito = ?
          AND saldo_pendiente >= ?
          AND estado_credito NOT IN ('ANULADO', 'PAGADO')
      `,
    ).bind(
      input.valorAbono,
      input.valorAbono,
      input.estadoCredito,
      input.idUsuario,
      input.idCredito,
      input.valorAbono,
    ),
    env.DB.prepare(
      `
        INSERT INTO abonos_creditos (
          id_abono,
          id_credito,
          id_cliente,
          id_usuario,
          valor_abono,
          metodo_pago,
          referencia_pago,
          fecha_abono,
          observaciones,
          estado_abono,
          creado_en
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 'ACTIVO', datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM creditos_clientes
          WHERE id_credito = ?
            AND saldo_pendiente = ?
            AND estado_credito = ?
        )
      `,
    ).bind(
      input.idAbono,
      input.idCredito,
      input.idCliente,
      input.idUsuario,
      input.valorAbono,
      input.metodoPago,
      input.referenciaPago,
      input.observaciones,
      input.idCredito,
      input.saldoNuevo,
      input.estadoCredito,
    ),
  ]);
}

export async function getCreditPaymentPersistenceStatus(
  env: ApiEnv,
  idCredito: string,
  idAbono: string,
): Promise<CreditPaymentPersistenceStatus> {
  const status = await env.DB.prepare(
    `
      SELECT
        cr.saldo_pendiente AS creditSaldoPendiente,
        cr.monto_abonado AS creditMontoAbonado,
        cr.estado_credito AS creditEstado,
        EXISTS (
          SELECT 1
          FROM abonos_creditos a
          WHERE a.id_abono = ?
            AND a.id_credito = cr.id_credito
            AND a.estado_abono = 'ACTIVO'
        ) AS paymentExists
      FROM creditos_clientes cr
      WHERE cr.id_credito = ?
      LIMIT 1
    `,
  )
    .bind(idAbono, idCredito)
    .first<{
      creditSaldoPendiente: number | null;
      creditMontoAbonado: number | null;
      creditEstado: CreditPaymentPersistenceStatus['creditEstado'];
      paymentExists: number;
    }>();

  return {
    creditSaldoPendiente: status?.creditSaldoPendiente ?? null,
    creditMontoAbonado: status?.creditMontoAbonado ?? null,
    creditEstado: status?.creditEstado ?? null,
    paymentExists: Boolean(status?.paymentExists),
  };
}

export async function cancelCreditPayment(
  env: ApiEnv,
  input: CancelCreditPaymentRepositoryInput,
): Promise<void> {
  // Anular un abono revierte cartera, no inventario ni ventas. Ambas escrituras
  // usan guardas para impedir doble anulacion y montos abonados negativos.
  await env.DB.batch([
    env.DB.prepare(
      `
        UPDATE creditos_clientes
        SET
          monto_abonado = ?,
          saldo_pendiente = ?,
          estado_credito = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
        WHERE id_credito = ?
          AND estado_credito != 'ANULADO'
          AND monto_abonado = ?
          AND saldo_pendiente = ?
          AND monto_abonado >= ?
          AND EXISTS (
            SELECT 1
            FROM abonos_creditos
            WHERE id_abono = ?
              AND id_credito = ?
              AND estado_abono = 'ACTIVO'
          )
      `,
    ).bind(
      input.montoAbonadoDespues,
      input.saldoDespues,
      input.estadoCredito,
      input.idUsuario,
      input.idCredito,
      input.montoAbonadoAntes,
      input.saldoAntes,
      input.valorAbono,
      input.idAbono,
      input.idCredito,
    ),
    env.DB.prepare(
      `
        UPDATE abonos_creditos
        SET
          estado_abono = 'ANULADO',
          anulado_por = ?,
          anulado_en = datetime('now'),
          motivo_anulacion = ?
        WHERE id_abono = ?
          AND id_credito = ?
          AND estado_abono = 'ACTIVO'
          AND EXISTS (
            SELECT 1
            FROM creditos_clientes
            WHERE id_credito = ?
              AND monto_abonado = ?
              AND saldo_pendiente = ?
              AND estado_credito = ?
          )
      `,
    ).bind(
      input.idUsuario,
      input.motivoAnulacion,
      input.idAbono,
      input.idCredito,
      input.idCredito,
      input.montoAbonadoDespues,
      input.saldoDespues,
      input.estadoCredito,
    ),
  ]);
}

export async function getCreditPaymentCancellationPersistenceStatus(
  env: ApiEnv,
  idCredito: string,
  idAbono: string,
): Promise<CreditPaymentCancellationPersistenceStatus> {
  const status = await env.DB.prepare(
    `
      SELECT
        cr.saldo_pendiente AS creditSaldoPendiente,
        cr.monto_abonado AS creditMontoAbonado,
        cr.estado_credito AS creditEstado,
        EXISTS (
          SELECT 1
          FROM abonos_creditos a
          WHERE a.id_abono = ?
            AND a.id_credito = cr.id_credito
            AND a.estado_abono = 'ANULADO'
        ) AS paymentCancelled,
        (
          SELECT a.anulado_por
          FROM abonos_creditos a
          WHERE a.id_abono = ?
            AND a.id_credito = cr.id_credito
        ) AS paymentCancelledBy,
        (
          SELECT a.anulado_en
          FROM abonos_creditos a
          WHERE a.id_abono = ?
            AND a.id_credito = cr.id_credito
        ) AS paymentCancelledAt,
        (
          SELECT a.motivo_anulacion
          FROM abonos_creditos a
          WHERE a.id_abono = ?
            AND a.id_credito = cr.id_credito
        ) AS paymentCancellationReason
      FROM creditos_clientes cr
      WHERE cr.id_credito = ?
      LIMIT 1
    `,
  )
    .bind(idAbono, idAbono, idAbono, idAbono, idCredito)
    .first<{
      creditSaldoPendiente: number | null;
      creditMontoAbonado: number | null;
      creditEstado: CreditPaymentCancellationPersistenceStatus['creditEstado'];
      paymentCancelled: number;
      paymentCancelledBy: string | null;
      paymentCancelledAt: string | null;
      paymentCancellationReason: string | null;
    }>();

  return {
    creditSaldoPendiente: status?.creditSaldoPendiente ?? null,
    creditMontoAbonado: status?.creditMontoAbonado ?? null,
    creditEstado: status?.creditEstado ?? null,
    paymentCancelled: Boolean(status?.paymentCancelled),
    paymentCancelledBy: status?.paymentCancelledBy ?? null,
    paymentCancelledAt: status?.paymentCancelledAt ?? null,
    paymentCancellationReason: status?.paymentCancellationReason ?? null,
  };
}

export async function createCreditAdjustment(
  env: ApiEnv,
  input: CreateCreditAdjustmentRepositoryInput,
): Promise<void> {
  // Un ajuste corrige cartera, no representa dinero recibido. Por eso no se
  // modifica monto_abonado y se guardan saldo_antes/saldo_despues como evidencia
  // auditable del efecto exacto de la decision administrativa.
  await env.DB.batch([
    env.DB.prepare(
      `
        UPDATE creditos_clientes
        SET
          saldo_pendiente = ?,
          estado_credito = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
        WHERE id_credito = ?
          AND estado_credito != 'ANULADO'
          AND saldo_pendiente = ?
          AND ? >= 0
      `,
    ).bind(
      input.saldoDespues,
      input.estadoCredito,
      input.idUsuario,
      input.idCredito,
      input.saldoAntes,
      input.saldoDespues,
    ),
    env.DB.prepare(
      `
        INSERT INTO ajustes_creditos (
          id_ajuste,
          id_credito,
          id_usuario,
          tipo_ajuste,
          valor_ajuste,
          saldo_antes,
          saldo_despues,
          motivo,
          creado_en
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        WHERE EXISTS (
          SELECT 1
          FROM creditos_clientes
          WHERE id_credito = ?
            AND saldo_pendiente = ?
            AND monto_abonado = ?
            AND estado_credito = ?
        )
      `,
    ).bind(
      input.idAjuste,
      input.idCredito,
      input.idUsuario,
      input.tipoAjuste,
      input.valorAjuste,
      input.saldoAntes,
      input.saldoDespues,
      input.motivo,
      input.idCredito,
      input.saldoDespues,
      input.montoAbonadoActual,
      input.estadoCredito,
    ),
  ]);
}

export async function getCreditAdjustmentPersistenceStatus(
  env: ApiEnv,
  idCredito: string,
  idAjuste: string,
): Promise<CreditAdjustmentPersistenceStatus> {
  const status = await env.DB.prepare(
    `
      SELECT
        cr.saldo_pendiente AS creditSaldoPendiente,
        cr.monto_abonado AS creditMontoAbonado,
        cr.estado_credito AS creditEstado,
        EXISTS (
          SELECT 1
          FROM ajustes_creditos aj
          WHERE aj.id_ajuste = ?
            AND aj.id_credito = cr.id_credito
        ) AS adjustmentExists
      FROM creditos_clientes cr
      WHERE cr.id_credito = ?
      LIMIT 1
    `,
  )
    .bind(idAjuste, idCredito)
    .first<{
      creditSaldoPendiente: number | null;
      creditMontoAbonado: number | null;
      creditEstado: CreditAdjustmentPersistenceStatus['creditEstado'];
      adjustmentExists: number;
    }>();

  return {
    creditSaldoPendiente: status?.creditSaldoPendiente ?? null,
    creditMontoAbonado: status?.creditMontoAbonado ?? null,
    creditEstado: status?.creditEstado ?? null,
    adjustmentExists: Boolean(status?.adjustmentExists),
  };
}
