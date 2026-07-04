import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import type { CreateUserInput, UpdateUserInput, UserRecord, UserStatus } from './users.types';

const mocks = vi.hoisted(() => ({
  users: new Map<string, UserRecord>(),
  emailIndex: new Map<string, string>(),
  usernameIndex: new Map<string, string>(),
  countActiveAdminsValue: 1,
  lastPasswordHash: '',
}));

vi.mock('../auth/password', () => ({
  hashPassword: vi.fn(async (password: string) => {
    mocks.lastPasswordHash = `hash:${password}`;
    return mocks.lastPasswordHash;
  }),
}));

vi.mock('./users.repository', () => ({
  listUsers: vi.fn(async () => [...mocks.users.values()]),
  findUserById: vi.fn(
    async (_env: ApiEnv, idUsuario: string) => mocks.users.get(idUsuario) ?? null,
  ),
  findUserByEmail: vi.fn(async (_env: ApiEnv, correo: string) => {
    const idUsuario = mocks.emailIndex.get(correo);
    return idUsuario ? (mocks.users.get(idUsuario) ?? null) : null;
  }),
  findUserByUsername: vi.fn(async (_env: ApiEnv, nombreUsuario: string) => {
    const idUsuario = mocks.usernameIndex.get(nombreUsuario);
    return idUsuario ? (mocks.users.get(idUsuario) ?? null) : null;
  }),
  createUser: vi.fn(
    async (
      _env: ApiEnv,
      idUsuario: string,
      input: CreateUserInput,
      passwordHash: string,
      createdByUserId: string,
    ) => {
      const user = createUserRecord({
        id_usuario: idUsuario,
        nombre_completo: input.nombreCompleto,
        nombre_usuario: input.nombreUsuario,
        correo: input.correo,
        contrasena_hash: passwordHash,
        rol: input.rol,
        creado_por: createdByUserId,
      });
      mocks.users.set(idUsuario, user);
      mocks.emailIndex.set(input.correo, idUsuario);
      mocks.usernameIndex.set(input.nombreUsuario, idUsuario);
      return user;
    },
  ),
  updateUser: vi.fn(async (_env: ApiEnv, idUsuario: string, input: UpdateUserInput) => {
    const user = mocks.users.get(idUsuario);
    if (!user) throw new Error('missing mock user');
    if (input.correo) {
      mocks.emailIndex.delete(user.correo);
      mocks.emailIndex.set(input.correo, idUsuario);
      user.correo = input.correo;
    }
    if (input.nombreCompleto) user.nombre_completo = input.nombreCompleto;
    if (input.nombreUsuario) {
      mocks.usernameIndex.delete(user.nombre_usuario);
      mocks.usernameIndex.set(input.nombreUsuario, idUsuario);
      user.nombre_usuario = input.nombreUsuario;
    }
    if (input.rol) user.rol = input.rol;
    return user;
  }),
  updateUserStatus: vi.fn(async (_env: ApiEnv, idUsuario: string, estado: UserStatus) => {
    const user = mocks.users.get(idUsuario);
    if (!user) throw new Error('missing mock user');
    user.estado = estado;
    return user;
  }),
  updateUserPassword: vi.fn(async (_env: ApiEnv, idUsuario: string, passwordHash: string) => {
    const user = mocks.users.get(idUsuario);
    if (!user) throw new Error('missing mock user');
    user.contrasena_hash = passwordHash;
    user.debe_cambiar_contrasena = 1;
    user.contrasena_actualizada_en = '2026-01-01 00:00:00';
    return user;
  }),
  countActiveAdmins: vi.fn(async () => mocks.countActiveAdminsValue),
}));

const { createUser, updateUser, updateUserStatus, resetUserPassword } =
  await import('./users.service');

const env = {} as ApiEnv;
const adminAuth = {
  user: createUserRecord({
    id_usuario: 'usr_admin',
    nombre_usuario: 'admin',
    correo: 'admin@norbe.test',
    rol: 'ADMINISTRADOR',
  }),
} satisfies AuthContext;

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id_usuario: 'usr_1',
    nombre_completo: 'Usuario',
    nombre_usuario: 'usuario',
    correo: 'usuario@norbe.test',
    contrasena_hash: 'hash',
    rol: 'VENDEDOR',
    estado: 'ACTIVO',
    ultimo_acceso: null,
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    debe_cambiar_contrasena: 1,
    contrasena_actualizada_en: null,
    creado_por: null,
    ...overrides,
  };
}

function addMockUser(user: UserRecord): void {
  mocks.users.set(user.id_usuario, user);
  mocks.emailIndex.set(user.correo, user.id_usuario);
  mocks.usernameIndex.set(user.nombre_usuario, user.id_usuario);
}

describe('users service', () => {
  beforeEach(() => {
    mocks.users = new Map();
    mocks.emailIndex = new Map();
    mocks.usernameIndex = new Map();
    mocks.countActiveAdminsValue = 1;
    mocks.lastPasswordHash = '';
  });

  it('crear usuario rechaza correo duplicado', async () => {
    addMockUser(createUserRecord({ correo: 'vendedor@norbe.test' }));

    await expect(
      createUser(env, adminAuth, {
        nombreCompleto: 'Vendedor',
        nombreUsuario: 'vendedor',
        correo: 'vendedor@norbe.test',
        rol: 'VENDEDOR',
        contrasena: 'clave123',
      }),
    ).rejects.toMatchObject({
      code: 'USER_EMAIL_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('crear usuario hashea contrasena y asigna auditoria', async () => {
    const user = await createUser(env, adminAuth, {
      nombreCompleto: 'Vendedor',
      nombreUsuario: 'vendedor',
      correo: 'vendedor@norbe.test',
      rol: 'VENDEDOR',
      contrasena: 'clave123',
    });

    expect(user.correo).toBe('vendedor@norbe.test');
    expect(user.nombreUsuario).toBe('vendedor');
    expect(user.creadoPor).toBe('usr_admin');
    expect(user.debeCambiarContrasena).toBe(true);
    expect(mocks.lastPasswordHash).toBe('hash:clave123');
  });

  it('editar usuario rechaza correo duplicado', async () => {
    addMockUser(createUserRecord({ id_usuario: 'usr_1', correo: 'uno@norbe.test' }));
    addMockUser(createUserRecord({ id_usuario: 'usr_2', correo: 'dos@norbe.test' }));

    await expect(updateUser(env, 'usr_1', { correo: 'dos@norbe.test' })).rejects.toMatchObject({
      code: 'USER_EMAIL_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('cambia estado a INACTIVO', async () => {
    addMockUser(createUserRecord({ id_usuario: 'usr_1', estado: 'ACTIVO' }));

    const user = await updateUserStatus(env, adminAuth, 'usr_1', { estado: 'INACTIVO' });

    expect(user.estado).toBe('INACTIVO');
  });

  it('impide desactivarse a si mismo', async () => {
    addMockUser(adminAuth.user);

    await expect(
      updateUserStatus(env, adminAuth, 'usr_admin', { estado: 'INACTIVO' }),
    ).rejects.toMatchObject({
      code: 'CANNOT_DEACTIVATE_SELF',
      status: 409,
    });
  });

  it('impide desactivar ultimo admin activo', async () => {
    addMockUser(
      createUserRecord({
        id_usuario: 'usr_other_admin',
        correo: 'admin2@norbe.test',
        rol: 'ADMINISTRADOR',
        estado: 'ACTIVO',
      }),
    );
    mocks.countActiveAdminsValue = 1;

    await expect(
      updateUserStatus(env, adminAuth, 'usr_other_admin', { estado: 'INACTIVO' }),
    ).rejects.toMatchObject({
      code: 'CANNOT_DEACTIVATE_LAST_ADMIN',
      status: 409,
    });
  });

  it('resetear contrasena usa hash y marca debe_cambiar_contrasena', async () => {
    addMockUser(createUserRecord({ id_usuario: 'usr_1', debe_cambiar_contrasena: 0 }));

    const user = await resetUserPassword(env, 'usr_1', { nuevaContrasena: 'nueva123' });

    expect(user.debeCambiarContrasena).toBe(true);
    expect(mocks.users.get('usr_1')?.contrasena_hash).toBe('hash:nueva123');
    expect(user.contrasenaActualizadaEn).toBe('2026-01-01 00:00:00');
  });

  it('usa errores controlados para usuario inexistente', async () => {
    await expect(
      updateUser(env, 'usr_missing', { nombreCompleto: 'Nuevo' }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
