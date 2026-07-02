import type { ApiEnv } from '../../config/env';
import type { CreateUserInput, UpdateUserInput, UserRecord, UserStatus } from './users.types';

const USER_COLUMNS = `
  id_usuario,
  nombre_completo,
  correo,
  contrasena_hash,
  rol,
  estado,
  ultimo_acceso,
  creado_en,
  actualizado_en,
  debe_cambiar_contrasena,
  contrasena_actualizada_en,
  creado_por
`;

export async function listUsers(env: ApiEnv): Promise<UserRecord[]> {
  const result = await env.DB.prepare(
    `
      SELECT ${USER_COLUMNS}
      FROM usuarios
      ORDER BY nombre_completo ASC
    `,
  ).all<UserRecord>();

  return result.results ?? [];
}

export async function findUserById(env: ApiEnv, idUsuario: string): Promise<UserRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${USER_COLUMNS}
      FROM usuarios
      WHERE id_usuario = ?
      LIMIT 1
    `,
  )
    .bind(idUsuario)
    .first<UserRecord>();
}

export async function findUserByEmail(env: ApiEnv, correo: string): Promise<UserRecord | null> {
  return env.DB.prepare(
    `
      SELECT ${USER_COLUMNS}
      FROM usuarios
      WHERE correo = ?
      LIMIT 1
    `,
  )
    .bind(correo)
    .first<UserRecord>();
}

export async function createUser(
  env: ApiEnv,
  idUsuario: string,
  input: CreateUserInput,
  passwordHash: string,
  createdByUserId: string,
): Promise<UserRecord> {
  await env.DB.prepare(
    `
      INSERT INTO usuarios (
        id_usuario,
        nombre_completo,
        correo,
        contrasena_hash,
        rol,
        estado,
        debe_cambiar_contrasena,
        contrasena_actualizada_en,
        creado_por,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVO', 1, datetime('now'), ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(idUsuario, input.nombreCompleto, input.correo, passwordHash, input.rol, createdByUserId)
    .run();

  return (await findUserById(env, idUsuario)) as UserRecord;
}

export async function updateUser(
  env: ApiEnv,
  idUsuario: string,
  input: UpdateUserInput,
): Promise<UserRecord> {
  const assignments: string[] = [];
  const values: string[] = [];

  if (input.nombreCompleto !== undefined) {
    assignments.push('nombre_completo = ?');
    values.push(input.nombreCompleto);
  }

  if (input.correo !== undefined) {
    assignments.push('correo = ?');
    values.push(input.correo);
  }

  if (input.rol !== undefined) {
    assignments.push('rol = ?');
    values.push(input.rol);
  }

  assignments.push("actualizado_en = datetime('now')");

  await env.DB.prepare(
    `
      UPDATE usuarios
      SET ${assignments.join(', ')}
      WHERE id_usuario = ?
    `,
  )
    .bind(...values, idUsuario)
    .run();

  return (await findUserById(env, idUsuario)) as UserRecord;
}

export async function updateUserStatus(
  env: ApiEnv,
  idUsuario: string,
  estado: UserStatus,
): Promise<UserRecord> {
  await env.DB.prepare(
    `
      UPDATE usuarios
      SET estado = ?,
          actualizado_en = datetime('now')
      WHERE id_usuario = ?
    `,
  )
    .bind(estado, idUsuario)
    .run();

  return (await findUserById(env, idUsuario)) as UserRecord;
}

export async function updateUserPassword(
  env: ApiEnv,
  idUsuario: string,
  passwordHash: string,
): Promise<UserRecord> {
  await env.DB.prepare(
    `
      UPDATE usuarios
      SET contrasena_hash = ?,
          contrasena_actualizada_en = datetime('now'),
          debe_cambiar_contrasena = 1,
          actualizado_en = datetime('now')
      WHERE id_usuario = ?
    `,
  )
    .bind(passwordHash, idUsuario)
    .run();

  return (await findUserById(env, idUsuario)) as UserRecord;
}

export async function countActiveAdmins(env: ApiEnv): Promise<number> {
  const row = await env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM usuarios
      WHERE rol = 'ADMINISTRADOR'
        AND estado = 'ACTIVO'
    `,
  ).first<{ total: number }>();

  return row?.total ?? 0;
}
