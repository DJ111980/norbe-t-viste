import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { hashPassword } from '../auth/password';
import { toPublicUser } from './users.mapper';
import * as usersRepository from './users.repository';
import type {
  CreateUserInput,
  PublicUser,
  ResetUserPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from './users.types';

function createUserId(): string {
  return `usr_${crypto.randomUUID()}`;
}

async function ensureUserExists(env: ApiEnv, idUsuario: string) {
  const user = await usersRepository.findUserById(env, idUsuario);

  if (!user) {
    throw new ApiError('USER_NOT_FOUND', 'El usuario no existe.', 404);
  }

  return user;
}

async function ensureEmailIsAvailable(
  env: ApiEnv,
  correo: string,
  currentUserId?: string,
): Promise<void> {
  const existingUser = await usersRepository.findUserByEmail(env, correo);

  if (existingUser && existingUser.id_usuario !== currentUserId) {
    throw new ApiError('USER_EMAIL_ALREADY_EXISTS', 'Ya existe un usuario con ese correo.', 409);
  }
}

export async function listUsers(env: ApiEnv): Promise<PublicUser[]> {
  const users = await usersRepository.listUsers(env);

  return users.map(toPublicUser);
}

export async function getUser(env: ApiEnv, idUsuario: string): Promise<PublicUser> {
  return toPublicUser(await ensureUserExists(env, idUsuario));
}

export async function createUser(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateUserInput,
): Promise<PublicUser> {
  await ensureEmailIsAvailable(env, input.correo);

  const passwordHash = await hashPassword(input.contrasena);
  const user = await usersRepository.createUser(
    env,
    createUserId(),
    input,
    passwordHash,
    auth.user.id_usuario,
  );

  return toPublicUser(user);
}

export async function updateUser(
  env: ApiEnv,
  idUsuario: string,
  input: UpdateUserInput,
): Promise<PublicUser> {
  await ensureUserExists(env, idUsuario);

  if (input.correo) {
    await ensureEmailIsAvailable(env, input.correo, idUsuario);
  }

  return toPublicUser(await usersRepository.updateUser(env, idUsuario, input));
}

export async function updateUserStatus(
  env: ApiEnv,
  auth: AuthContext,
  idUsuario: string,
  input: UpdateUserStatusInput,
): Promise<PublicUser> {
  const user = await ensureUserExists(env, idUsuario);

  if (auth.user.id_usuario === idUsuario && input.estado === 'INACTIVO') {
    throw new ApiError('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propio usuario.', 409);
  }

  if (user.rol === 'ADMINISTRADOR' && user.estado === 'ACTIVO' && input.estado === 'INACTIVO') {
    const activeAdmins = await usersRepository.countActiveAdmins(env);

    if (activeAdmins <= 1) {
      throw new ApiError(
        'CANNOT_DEACTIVATE_LAST_ADMIN',
        'No puedes desactivar el ultimo administrador activo.',
        409,
      );
    }
  }

  // Los usuarios no se eliminan fisicamente: cambiar estado conserva auditoria e historial.
  return toPublicUser(await usersRepository.updateUserStatus(env, idUsuario, input.estado));
}

export async function resetUserPassword(
  env: ApiEnv,
  idUsuario: string,
  input: ResetUserPasswordInput,
): Promise<PublicUser> {
  await ensureUserExists(env, idUsuario);

  const passwordHash = await hashPassword(input.nuevaContrasena);

  return toPublicUser(await usersRepository.updateUserPassword(env, idUsuario, passwordHash));
}
