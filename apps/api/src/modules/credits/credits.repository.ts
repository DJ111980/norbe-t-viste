import type { ApiEnv } from '../../config/env';
import type {
  CreateOldDebtInput,
  CreditAdjustmentRecord,
  CreditClientRecord,
  CreditDetailRecord,
  CreditDetailViewRecord,
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
        sku,
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
