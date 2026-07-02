import type { ApiEnv } from '../../config/env';
import type { UserRecord } from './auth.types';

export async function findUserByEmail(env: ApiEnv, correo: string): Promise<UserRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        id_usuario,
        nombre_completo,
        correo,
        contrasena_hash,
        rol,
        estado
      FROM usuarios
      WHERE correo = ?
      LIMIT 1
    `,
  )
    .bind(correo)
    .first<UserRecord>();
}

export async function findUserById(env: ApiEnv, idUsuario: string): Promise<UserRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        id_usuario,
        nombre_completo,
        correo,
        contrasena_hash,
        rol,
        estado
      FROM usuarios
      WHERE id_usuario = ?
      LIMIT 1
    `,
  )
    .bind(idUsuario)
    .first<UserRecord>();
}

export async function updateLastAccess(env: ApiEnv, idUsuario: string): Promise<void> {
  await env.DB.prepare(
    `
      UPDATE usuarios
      SET ultimo_acceso = datetime('now'),
          actualizado_en = datetime('now')
      WHERE id_usuario = ?
    `,
  )
    .bind(idUsuario)
    .run();
}
