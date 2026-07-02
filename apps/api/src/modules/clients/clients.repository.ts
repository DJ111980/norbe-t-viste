import type { ApiEnv } from '../../config/env';
import type {
  ClientRecord,
  ClientStatus,
  CreateClientInput,
  ListClientsFilters,
  UpdateClientInput,
} from './clients.types';

const CLIENT_COLUMNS = `
  id_cliente,
  nombre_completo,
  documento,
  telefono,
  telefono_secundario,
  direccion,
  ciudad,
  correo,
  observaciones,
  estado,
  creado_en,
  actualizado_en,
  creado_por,
  actualizado_por,
  fecha_ultima_compra
`;

export async function listClients(
  env: ApiEnv,
  filters: ListClientsFilters,
): Promise<ClientRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.buscar) {
    where.push('(nombre_completo LIKE ? OR telefono LIKE ? OR documento LIKE ? OR correo LIKE ?)');
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (filters.estado) {
    where.push('estado = ?');
    values.push(filters.estado);
  }

  if (filters.telefono) {
    where.push('telefono = ?');
    values.push(filters.telefono);
  }

  if (filters.documento) {
    where.push('documento = ?');
    values.push(filters.documento);
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${CLIENT_COLUMNS}
      FROM clientes
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<ClientRecord>();

  return result.results ?? [];
}

export async function findClientById(env: ApiEnv, idCliente: string): Promise<ClientRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${CLIENT_COLUMNS}
      FROM clientes
      WHERE id_cliente = ?
      LIMIT 1
    `,
  )
    .bind(idCliente)
    .first<ClientRecord>();
}

export async function findClientByDocument(
  env: ApiEnv,
  documento: string,
): Promise<ClientRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${CLIENT_COLUMNS}
      FROM clientes
      WHERE documento = ?
      LIMIT 1
    `,
  )
    .bind(documento)
    .first<ClientRecord>();
}

export async function createClient(
  env: ApiEnv,
  idCliente: string,
  input: CreateClientInput,
  userId: string,
): Promise<ClientRecord> {
  await env.DB.prepare(
    `
      INSERT INTO clientes (
        id_cliente,
        nombre_completo,
        documento,
        telefono,
        telefono_secundario,
        direccion,
        ciudad,
        correo,
        observaciones,
        estado,
        creado_por,
        actualizado_por,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idCliente,
      input.nombreCompleto,
      input.documento,
      input.telefono,
      input.telefonoSecundario,
      input.direccion,
      input.ciudad,
      input.correo,
      input.observaciones,
      userId,
      userId,
    )
    .run();

  return (await findClientById(env, idCliente)) as ClientRecord;
}

export async function updateClient(
  env: ApiEnv,
  idCliente: string,
  input: UpdateClientInput,
  userId: string,
): Promise<ClientRecord> {
  const assignments: string[] = [];
  const values: (string | null)[] = [];

  if (input.nombreCompleto !== undefined) {
    assignments.push('nombre_completo = ?');
    values.push(input.nombreCompleto);
  }

  if (input.documento !== undefined) {
    assignments.push('documento = ?');
    values.push(input.documento);
  }

  if (input.telefono !== undefined) {
    assignments.push('telefono = ?');
    values.push(input.telefono);
  }

  if (input.telefonoSecundario !== undefined) {
    assignments.push('telefono_secundario = ?');
    values.push(input.telefonoSecundario);
  }

  if (input.direccion !== undefined) {
    assignments.push('direccion = ?');
    values.push(input.direccion);
  }

  if (input.ciudad !== undefined) {
    assignments.push('ciudad = ?');
    values.push(input.ciudad);
  }

  if (input.correo !== undefined) {
    assignments.push('correo = ?');
    values.push(input.correo);
  }

  if (input.observaciones !== undefined) {
    assignments.push('observaciones = ?');
    values.push(input.observaciones);
  }

  assignments.push('actualizado_por = ?', "actualizado_en = datetime('now')");
  values.push(userId);

  await env.DB.prepare(
    `
      UPDATE clientes
      SET ${assignments.join(', ')}
      WHERE id_cliente = ?
    `,
  )
    .bind(...values, idCliente)
    .run();

  return (await findClientById(env, idCliente)) as ClientRecord;
}

export async function updateClientStatus(
  env: ApiEnv,
  idCliente: string,
  estado: ClientStatus,
  userId: string,
): Promise<ClientRecord> {
  await env.DB.prepare(
    `
      UPDATE clientes
      SET estado = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
      WHERE id_cliente = ?
    `,
  )
    .bind(estado, userId, idCliente)
    .run();

  return (await findClientById(env, idCliente)) as ClientRecord;
}
