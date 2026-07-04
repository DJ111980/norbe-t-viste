import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { buildInternalKey, deleteObject, getObject, uploadObject } from '../../services/r2';
import { hashPassword } from '../auth/password';
import type { ImageUploadInput } from '../images/images.types';
import { toPublicUser } from './users.mapper';
import * as usersRepository from './users.repository';
import type {
  CreateUserInput,
  PublicUser,
  ResetUserPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from './users.types';

type UserAvatarInput = ImageUploadInput;

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

async function ensureUsernameIsAvailable(
  env: ApiEnv,
  nombreUsuario: string,
  currentUserId?: string,
): Promise<void> {
  const existingUser = await usersRepository.findUserByUsername(env, nombreUsuario);

  if (existingUser && existingUser.id_usuario !== currentUserId) {
    throw new ApiError(
      'USER_NAME_ALREADY_EXISTS',
      'Ya existe un usuario con ese nombre de usuario.',
      409,
    );
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
  await ensureUsernameIsAvailable(env, input.nombreUsuario);

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

  if (input.nombreUsuario) {
    await ensureUsernameIsAvailable(env, input.nombreUsuario, idUsuario);
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

function buildUserAvatarKey(idUsuario: string, extension: UserAvatarInput['extension']): string {
  return buildInternalKey(['usuarios', idUsuario, 'avatar', `${crypto.randomUUID()}.${extension}`]);
}

async function deletePreviousAvatarSafely(env: ApiEnv, key: string | null): Promise<void> {
  if (!key) return;

  try {
    await deleteObject(env, key);
  } catch {
    // La referencia en D1 manda. Si el objeto viejo no se borra, no rompe el flujo del usuario.
  }
}

export async function uploadUserAvatar(
  env: ApiEnv,
  idUsuario: string,
  input: UserAvatarInput,
): Promise<PublicUser> {
  const user = await ensureUserExists(env, idUsuario);
  const avatarKey = buildUserAvatarKey(idUsuario, input.extension);

  await uploadObject(env, {
    key: avatarKey,
    body: await input.file.arrayBuffer(),
    contentType: input.contentType,
  });

  const updatedUser = await usersRepository.updateUserAvatar(
    env,
    idUsuario,
    avatarKey,
    input.contentType,
  );

  await deletePreviousAvatarSafely(env, user.avatar_key);

  return toPublicUser(updatedUser);
}

export async function deleteUserAvatar(env: ApiEnv, idUsuario: string): Promise<PublicUser> {
  const user = await ensureUserExists(env, idUsuario);

  if (!user.avatar_key) {
    throw new ApiError(
      'USER_AVATAR_NOT_CONFIGURED',
      'El usuario no tiene avatar configurado.',
      404,
    );
  }

  const updatedUser = await usersRepository.updateUserAvatar(env, idUsuario, null, null);
  await deletePreviousAvatarSafely(env, user.avatar_key);

  return toPublicUser(updatedUser);
}

export async function getUserAvatarFile(env: ApiEnv, idUsuario: string): Promise<Response> {
  const user = await ensureUserExists(env, idUsuario);

  if (!user.avatar_key) {
    throw new ApiError(
      'USER_AVATAR_NOT_CONFIGURED',
      'El usuario no tiene avatar configurado.',
      404,
    );
  }

  const object = await getObject(env, user.avatar_key);

  return new Response(object.body, {
    headers: {
      'content-type': user.avatar_content_type ?? object.contentType,
      'cache-control': 'private, max-age=300',
    },
  });
}
