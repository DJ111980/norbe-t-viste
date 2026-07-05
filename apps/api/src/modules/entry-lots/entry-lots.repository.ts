import type { ApiEnv } from '../../config/env';
import type {
  CreateEntryLotDetailInput,
  CreateEntryLotInput,
  ConfirmEntryLotMovementInput,
  CancelEntryLotMovementInput,
  EntryLotDetailRecord,
  EntryLotRecord,
  ListEntryLotsFilters,
  ProviderForEntryLot,
  UpdateEntryLotDetailInput,
  UpdateEntryLotInput,
  VariantForEntryLotDetail,
} from './entry-lots.types';

const ENTRY_LOT_COLUMNS = `
  l.id_lote,
  l.id_proveedor,
  p.nombre_proveedor,
  p.estado AS estado_proveedor,
  l.creado_por,
  l.actualizado_por,
  l.confirmado_por,
  l.confirmado_en,
  l.anulado_por,
  l.anulado_en,
  l.motivo_anulacion,
  l.numero_lote,
  l.tipo_lote,
  l.fecha_lote,
  l.numero_factura_proveedor,
  l.numero_guia_envio,
  l.modo_envio,
  l.empresa_transportadora,
  l.costo_envio,
  l.total_compra,
  l.estado_lote,
  l.observaciones,
  l.creado_en,
  l.actualizado_en
`;

const DETAIL_COLUMNS = `
  d.id_detalle_lote,
  d.id_lote,
  d.id_variante,
  d.cantidad,
  d.costo_unitario,
  d.precio_venta_sugerido,
  d.subtotal,
  d.cantidad_etiquetas_qr,
  d.observaciones,
  d.creado_en,
  d.actualizado_en,
  v.codigo_qr,
  v.talla,
  v.color,
  v.estado AS estado_variante,
  v.stock_actual,
  p.id_producto,
  p.nombre_producto,
  p.estado AS estado_producto
`;

export async function listEntryLots(
  env: ApiEnv,
  filters: ListEntryLotsFilters,
): Promise<EntryLotRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.estado) {
    where.push('l.estado_lote = ?');
    values.push(filters.estado);
  }
  if (filters.proveedor) {
    where.push('l.id_proveedor = ?');
    values.push(filters.proveedor);
  }
  if (filters.buscar) {
    where.push(
      '(l.numero_factura_proveedor LIKE ? OR p.nombre_proveedor LIKE ? OR l.observaciones LIKE ?)',
    );
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue);
  }
  if (filters.fechaDesde) {
    where.push('l.fecha_lote >= ?');
    values.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    where.push('l.fecha_lote <= ?');
    values.push(filters.fechaHasta);
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT
        ${ENTRY_LOT_COLUMNS},
        COUNT(d.id_detalle_lote) AS cantidad_detalles,
        COALESCE(SUM(d.subtotal), 0) AS total_estimado
      FROM lotes_entrada l
      LEFT JOIN proveedores p ON p.id_proveedor = l.id_proveedor
      LEFT JOIN detalle_lotes_entrada d ON d.id_lote = l.id_lote
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY l.id_lote
      ORDER BY l.creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<EntryLotRecord>();

  return result.results ?? [];
}

export async function findEntryLotById(
  env: ApiEnv,
  idLote: string,
): Promise<EntryLotRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${ENTRY_LOT_COLUMNS}
      FROM lotes_entrada l
      LEFT JOIN proveedores p ON p.id_proveedor = l.id_proveedor
      WHERE l.id_lote = ?
      LIMIT 1
    `,
  )
    .bind(idLote)
    .first<EntryLotRecord>();
}

export async function findEntryLotDetails(
  env: ApiEnv,
  idLote: string,
): Promise<EntryLotDetailRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT ${DETAIL_COLUMNS}
      FROM detalle_lotes_entrada d
      INNER JOIN variantes_producto v ON v.id_variante = d.id_variante
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE d.id_lote = ?
      ORDER BY d.creado_en ASC
    `,
  )
    .bind(idLote)
    .all<EntryLotDetailRecord>();

  return result.results ?? [];
}

export async function findEntryLotDetailById(
  env: ApiEnv,
  idLote: string,
  idDetalle: string,
): Promise<EntryLotDetailRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${DETAIL_COLUMNS}
      FROM detalle_lotes_entrada d
      INNER JOIN variantes_producto v ON v.id_variante = d.id_variante
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE d.id_lote = ?
        AND d.id_detalle_lote = ?
      LIMIT 1
    `,
  )
    .bind(idLote, idDetalle)
    .first<EntryLotDetailRecord>();
}

export async function findProviderForEntryLot(
  env: ApiEnv,
  idProveedor: string,
): Promise<ProviderForEntryLot | null> {
  return env.DB.prepare(
    `
      SELECT id_proveedor, nombre_proveedor, estado
      FROM proveedores
      WHERE id_proveedor = ?
      LIMIT 1
    `,
  )
    .bind(idProveedor)
    .first<ProviderForEntryLot>();
}

export async function findVariantForEntryLotDetail(
  env: ApiEnv,
  idVariante: string,
): Promise<VariantForEntryLotDetail | null> {
  return env.DB.prepare(
    `
      SELECT
        v.id_variante,
        v.estado,
        v.stock_actual,
        p.id_producto,
        p.nombre_producto,
        p.estado AS estado_producto
      FROM variantes_producto v
      INNER JOIN productos p ON p.id_producto = v.id_producto
      WHERE v.id_variante = ?
      LIMIT 1
    `,
  )
    .bind(idVariante)
    .first<VariantForEntryLotDetail>();
}

export async function createEntryLot(
  env: ApiEnv,
  idLote: string,
  numeroLote: string,
  input: CreateEntryLotInput,
  userId: string,
): Promise<EntryLotRecord> {
  await env.DB.prepare(
    `
      INSERT INTO lotes_entrada (
        id_lote,
        id_proveedor,
        creado_por,
        actualizado_por,
        numero_lote,
        tipo_lote,
        fecha_lote,
        numero_factura_proveedor,
        estado_lote,
        observaciones,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, 'COMPRA', ?, ?, 'BORRADOR', ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idLote,
      input.idProveedor,
      userId,
      userId,
      numeroLote,
      input.fechaLote,
      input.numeroFactura,
      input.observaciones,
    )
    .run();

  return (await findEntryLotById(env, idLote)) as EntryLotRecord;
}

export async function updateEntryLot(
  env: ApiEnv,
  idLote: string,
  input: UpdateEntryLotInput,
  userId: string,
): Promise<EntryLotRecord> {
  const assignments: string[] = [];
  const values: (string | null)[] = [];

  if (input.idProveedor !== undefined) {
    assignments.push('id_proveedor = ?');
    values.push(input.idProveedor);
  }
  if (input.numeroFactura !== undefined) {
    assignments.push('numero_factura_proveedor = ?');
    values.push(input.numeroFactura);
  }
  if (input.fechaLote !== undefined) {
    assignments.push('fecha_lote = ?');
    values.push(input.fechaLote);
  }
  if (input.observaciones !== undefined) {
    assignments.push('observaciones = ?');
    values.push(input.observaciones);
  }

  assignments.push('actualizado_por = ?', "actualizado_en = datetime('now')");
  values.push(userId);

  await env.DB.prepare(
    `
      UPDATE lotes_entrada
      SET ${assignments.join(', ')}
      WHERE id_lote = ?
    `,
  )
    .bind(...values, idLote)
    .run();

  return (await findEntryLotById(env, idLote)) as EntryLotRecord;
}

export async function createEntryLotDetail(
  env: ApiEnv,
  idDetalle: string,
  idLote: string,
  input: CreateEntryLotDetailInput,
  subtotal: number,
): Promise<EntryLotDetailRecord> {
  await env.DB.prepare(
    `
      INSERT INTO detalle_lotes_entrada (
        id_detalle_lote,
        id_lote,
        id_variante,
        cantidad,
        costo_unitario,
        precio_venta_sugerido,
        subtotal,
        cantidad_etiquetas_qr,
        observaciones,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idDetalle,
      idLote,
      input.idVariante,
      input.cantidad,
      input.costoUnitario,
      input.precioVentaSugerido,
      subtotal,
      input.cantidadEtiquetasQr ?? input.cantidad,
      input.observaciones,
    )
    .run();

  return (await findEntryLotDetailById(env, idLote, idDetalle)) as EntryLotDetailRecord;
}

export async function updateEntryLotDetail(
  env: ApiEnv,
  idLote: string,
  idDetalle: string,
  input: UpdateEntryLotDetailInput,
  subtotal: number,
): Promise<EntryLotDetailRecord> {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.cantidad !== undefined) {
    assignments.push('cantidad = ?');
    values.push(input.cantidad);
  }
  if (input.costoUnitario !== undefined) {
    assignments.push('costo_unitario = ?');
    values.push(input.costoUnitario);
  }
  if (input.precioVentaSugerido !== undefined) {
    assignments.push('precio_venta_sugerido = ?');
    values.push(input.precioVentaSugerido);
  }
  if (input.cantidadEtiquetasQr !== undefined) {
    assignments.push('cantidad_etiquetas_qr = ?');
    values.push(input.cantidadEtiquetasQr);
  }
  if (input.observaciones !== undefined) {
    assignments.push('observaciones = ?');
    values.push(input.observaciones);
  }

  assignments.push('subtotal = ?', "actualizado_en = datetime('now')");
  values.push(subtotal);

  await env.DB.prepare(
    `
      UPDATE detalle_lotes_entrada
      SET ${assignments.join(', ')}
      WHERE id_lote = ?
        AND id_detalle_lote = ?
    `,
  )
    .bind(...values, idLote, idDetalle)
    .run();

  return (await findEntryLotDetailById(env, idLote, idDetalle)) as EntryLotDetailRecord;
}

export async function deleteEntryLotDetail(
  env: ApiEnv,
  idLote: string,
  idDetalle: string,
): Promise<void> {
  await env.DB.prepare(
    `
      DELETE FROM detalle_lotes_entrada
      WHERE id_lote = ?
        AND id_detalle_lote = ?
    `,
  )
    .bind(idLote, idDetalle)
    .run();
}

export async function confirmEntryLot(
  env: ApiEnv,
  idLote: string,
  userId: string,
  movements: ConfirmEntryLotMovementInput[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const movement of movements) {
    statements.push(
      env.DB.prepare(
        `
          UPDATE variantes_producto
          SET stock_actual = stock_actual + ?,
              actualizado_en = datetime('now')
          WHERE id_variante = ?
            AND EXISTS (
              SELECT 1
              FROM lotes_entrada
              WHERE id_lote = ?
                AND estado_lote = 'BORRADOR'
            )
        `,
      ).bind(movement.cantidad, movement.idVariante, idLote),
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
          SELECT ?, ?, ?, 'LOTE_ENTRADA', ?, ?, ?, ?, 'LOTE_ENTRADA', ?, datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM lotes_entrada
            WHERE id_lote = ?
              AND estado_lote = 'BORRADOR'
          )
        `,
      ).bind(
        movement.idMovimiento,
        movement.idVariante,
        userId,
        movement.cantidad,
        movement.stockAntes,
        movement.stockDespues,
        'Confirmacion de lote de entrada',
        idLote,
        idLote,
      ),
    );
  }

  statements.push(
    env.DB.prepare(
      `
        UPDATE lotes_entrada
        SET estado_lote = 'CONFIRMADO',
            confirmado_por = ?,
            confirmado_en = datetime('now'),
            actualizado_por = ?,
            actualizado_en = datetime('now')
        WHERE id_lote = ?
          AND estado_lote = 'BORRADOR'
      `,
    ).bind(userId, userId, idLote),
  );

  // D1 ejecuta batch como una unidad transaccional. Ademas cada sentencia queda
  // condicionada a que el lote siga en BORRADOR para reducir el riesgo de una
  // doble confirmacion en ejecuciones cercanas.
  await env.DB.batch(statements);
}

export async function cancelEntryLot(
  env: ApiEnv,
  idLote: string,
  userId: string,
  motivo: string,
  movements: CancelEntryLotMovementInput[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const movement of movements) {
    statements.push(
      env.DB.prepare(
        `
          UPDATE variantes_producto
          SET stock_actual = stock_actual - ?,
              actualizado_en = datetime('now')
          WHERE id_variante = ?
            AND stock_actual >= ?
            AND EXISTS (
              SELECT 1
              FROM lotes_entrada
              WHERE id_lote = ?
                AND estado_lote = 'CONFIRMADO'
            )
        `,
      ).bind(movement.cantidad, movement.idVariante, movement.cantidad, idLote),
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
          SELECT ?, ?, ?, 'AJUSTE_NEGATIVO', ?, ?, ?, ?, 'LOTE_ENTRADA', ?, datetime('now')
          WHERE EXISTS (
            SELECT 1
            FROM lotes_entrada
            WHERE id_lote = ?
              AND estado_lote = 'CONFIRMADO'
          )
        `,
      ).bind(
        movement.idMovimiento,
        movement.idVariante,
        userId,
        movement.cantidad,
        movement.stockAntes,
        movement.stockDespues,
        movement.motivo,
        idLote,
        idLote,
      ),
    );
  }

  statements.push(
    env.DB.prepare(
      `
        UPDATE lotes_entrada
        SET estado_lote = 'ANULADO',
            anulado_por = ?,
            anulado_en = datetime('now'),
            motivo_anulacion = ?,
            actualizado_por = ?,
            actualizado_en = datetime('now')
        WHERE id_lote = ?
          AND estado_lote IN ('BORRADOR', 'CONFIRMADO')
      `,
    ).bind(userId, motivo, userId, idLote),
  );

  await env.DB.batch(statements);
}
