import type { ApiEnv } from '../../config/env';
import type {
  CreateProviderInput,
  ListProvidersFilters,
  ProviderRecord,
  ProviderStatus,
  UpdateProviderInput,
} from './providers.types';

const PROVIDER_COLUMNS = `
  id_proveedor,
  nombre_proveedor,
  tipo_documento,
  numero_documento,
  nombre_contacto,
  telefono_principal,
  telefono_secundario,
  correo,
  ciudad,
  direccion,
  pais,
  modo_envio,
  empresa_transportadora,
  tiempo_entrega_estimado,
  forma_pago,
  cuenta_pago,
  notas,
  estado,
  creado_en,
  actualizado_en,
  creado_por,
  actualizado_por,
  fecha_ultimo_lote,
  nombre_normalizado
`;

export async function listProviders(
  env: ApiEnv,
  filters: ListProvidersFilters,
): Promise<ProviderRecord[]> {
  const where: string[] = [];
  const values: (string | number)[] = [];

  if (filters.buscar) {
    where.push(
      `(
        nombre_proveedor LIKE ?
        OR nombre_contacto LIKE ?
        OR telefono_principal LIKE ?
        OR numero_documento LIKE ?
        OR correo LIKE ?
        OR ciudad LIKE ?
      )`,
    );
    const searchValue = `%${filters.buscar}%`;
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (filters.estado) {
    where.push('estado = ?');
    values.push(filters.estado);
  }

  if (filters.ciudad) {
    where.push('ciudad = ?');
    values.push(filters.ciudad);
  }

  if (filters.telefono) {
    where.push('telefono_principal = ?');
    values.push(filters.telefono);
  }

  if (filters.modoEnvio) {
    where.push('modo_envio = ?');
    values.push(filters.modoEnvio);
  }

  values.push(filters.limit, filters.offset);

  const result = await env.DB.prepare(
    `
      SELECT ${PROVIDER_COLUMNS}
      FROM proveedores
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY creado_en DESC
      LIMIT ?
      OFFSET ?
    `,
  )
    .bind(...values)
    .all<ProviderRecord>();

  return result.results ?? [];
}

export async function findProviderById(
  env: ApiEnv,
  idProveedor: string,
): Promise<ProviderRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${PROVIDER_COLUMNS}
      FROM proveedores
      WHERE id_proveedor = ?
      LIMIT 1
    `,
  )
    .bind(idProveedor)
    .first<ProviderRecord>();
}

export async function findProviderByNormalizedName(
  env: ApiEnv,
  nombreNormalizado: string,
): Promise<ProviderRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${PROVIDER_COLUMNS}
      FROM proveedores
      WHERE nombre_normalizado = ?
      LIMIT 1
    `,
  )
    .bind(nombreNormalizado)
    .first<ProviderRecord>();
}

export async function createProvider(
  env: ApiEnv,
  idProveedor: string,
  input: CreateProviderInput,
  userId: string,
): Promise<ProviderRecord> {
  await env.DB.prepare(
    `
      INSERT INTO proveedores (
        id_proveedor,
        nombre_proveedor,
        nombre_normalizado,
        tipo_documento,
        numero_documento,
        nombre_contacto,
        telefono_principal,
        telefono_secundario,
        correo,
        ciudad,
        direccion,
        pais,
        modo_envio,
        empresa_transportadora,
        tiempo_entrega_estimado,
        forma_pago,
        cuenta_pago,
        notas,
        estado,
        creado_por,
        actualizado_por,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      idProveedor,
      input.nombreProveedor,
      input.nombreNormalizado,
      input.tipoDocumento,
      input.numeroDocumento,
      input.nombreContacto,
      input.telefonoPrincipal,
      input.telefonoSecundario,
      input.correo,
      input.ciudad,
      input.direccion,
      input.pais,
      input.modoEnvio,
      input.empresaTransportadora,
      input.tiempoEntregaEstimado,
      input.formaPago,
      input.cuentaPago,
      input.notas,
      userId,
      userId,
    )
    .run();

  return (await findProviderById(env, idProveedor)) as ProviderRecord;
}

export async function updateProvider(
  env: ApiEnv,
  idProveedor: string,
  input: UpdateProviderInput,
  userId: string,
): Promise<ProviderRecord> {
  const assignments: string[] = [];
  const values: (string | null)[] = [];

  if (input.nombreProveedor !== undefined) {
    assignments.push('nombre_proveedor = ?');
    values.push(input.nombreProveedor);
  }

  if (input.nombreNormalizado !== undefined) {
    assignments.push('nombre_normalizado = ?');
    values.push(input.nombreNormalizado);
  }

  if (input.tipoDocumento !== undefined) {
    assignments.push('tipo_documento = ?');
    values.push(input.tipoDocumento);
  }

  if (input.numeroDocumento !== undefined) {
    assignments.push('numero_documento = ?');
    values.push(input.numeroDocumento);
  }

  if (input.nombreContacto !== undefined) {
    assignments.push('nombre_contacto = ?');
    values.push(input.nombreContacto);
  }

  if (input.telefonoPrincipal !== undefined) {
    assignments.push('telefono_principal = ?');
    values.push(input.telefonoPrincipal);
  }

  if (input.telefonoSecundario !== undefined) {
    assignments.push('telefono_secundario = ?');
    values.push(input.telefonoSecundario);
  }

  if (input.correo !== undefined) {
    assignments.push('correo = ?');
    values.push(input.correo);
  }

  if (input.ciudad !== undefined) {
    assignments.push('ciudad = ?');
    values.push(input.ciudad);
  }

  if (input.direccion !== undefined) {
    assignments.push('direccion = ?');
    values.push(input.direccion);
  }

  if (input.pais !== undefined) {
    assignments.push('pais = ?');
    values.push(input.pais);
  }

  if (input.modoEnvio !== undefined) {
    assignments.push('modo_envio = ?');
    values.push(input.modoEnvio);
  }

  if (input.empresaTransportadora !== undefined) {
    assignments.push('empresa_transportadora = ?');
    values.push(input.empresaTransportadora);
  }

  if (input.tiempoEntregaEstimado !== undefined) {
    assignments.push('tiempo_entrega_estimado = ?');
    values.push(input.tiempoEntregaEstimado);
  }

  if (input.formaPago !== undefined) {
    assignments.push('forma_pago = ?');
    values.push(input.formaPago);
  }

  if (input.cuentaPago !== undefined) {
    assignments.push('cuenta_pago = ?');
    values.push(input.cuentaPago);
  }

  if (input.notas !== undefined) {
    assignments.push('notas = ?');
    values.push(input.notas);
  }

  assignments.push('actualizado_por = ?', "actualizado_en = datetime('now')");
  values.push(userId);

  await env.DB.prepare(
    `
      UPDATE proveedores
      SET ${assignments.join(', ')}
      WHERE id_proveedor = ?
    `,
  )
    .bind(...values, idProveedor)
    .run();

  return (await findProviderById(env, idProveedor)) as ProviderRecord;
}

export async function updateProviderStatus(
  env: ApiEnv,
  idProveedor: string,
  estado: ProviderStatus,
  userId: string,
): Promise<ProviderRecord> {
  await env.DB.prepare(
    `
      UPDATE proveedores
      SET estado = ?,
          actualizado_por = ?,
          actualizado_en = datetime('now')
      WHERE id_proveedor = ?
    `,
  )
    .bind(estado, userId, idProveedor)
    .run();

  return (await findProviderById(env, idProveedor)) as ProviderRecord;
}
