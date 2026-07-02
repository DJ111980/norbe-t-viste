import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { UserRecord } from './auth.types';
import { hashPassword } from './password';

const mocks = vi.hoisted(() => ({
  user: null as UserRecord | null,
  updatedUserIds: [] as string[],
}));

vi.mock('./auth.repository', () => ({
  findUserByEmail: vi.fn(async () => mocks.user),
  updateLastAccess: vi.fn(async (_env: ApiEnv, idUsuario: string) => {
    mocks.updatedUserIds.push(idUsuario);
  }),
}));

const { login } = await import('./auth.service');

const env = {
  JWT_SECRET: 'secret-local-solo-para-pruebas',
  JWT_EXPIRES_IN: '1h',
} as ApiEnv;

async function createUser(overrides: Partial<UserRecord> = {}): Promise<UserRecord> {
  return {
    id_usuario: 'usr_1',
    nombre_completo: 'Administrador',
    correo: 'admin@norbe.test',
    contrasena_hash: await hashPassword('Clave segura 123'),
    rol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
    ...overrides,
  };
}

describe('auth service login', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.updatedUserIds = [];
  });

  it('rechaza login con usuario inexistente', async () => {
    await expect(
      login(env, { correo: 'noexiste@norbe.test', contrasena: 'Clave segura 123' }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
  });

  it('rechaza login con contrasena incorrecta', async () => {
    mocks.user = await createUser();

    await expect(
      login(env, { correo: 'admin@norbe.test', contrasena: 'incorrecta' }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
  });

  it('rechaza login con usuario inactivo', async () => {
    mocks.user = await createUser({ estado: 'INACTIVO' });

    await expect(
      login(env, { correo: 'admin@norbe.test', contrasena: 'Clave segura 123' }),
    ).rejects.toMatchObject({
      code: 'USER_INACTIVE',
      status: 403,
    });
  });

  it('crea sesion para usuario activo con credenciales correctas', async () => {
    mocks.user = await createUser();

    const session = await login(env, {
      correo: 'admin@norbe.test',
      contrasena: 'Clave segura 123',
    });

    expect(session.tokenType).toBe('Bearer');
    expect(session.token.length).toBeGreaterThan(20);
    expect(session.user).toEqual({
      idUsuario: 'usr_1',
      nombreCompleto: 'Administrador',
      correo: 'admin@norbe.test',
      rol: 'ADMINISTRADOR',
    });
    expect(mocks.updatedUserIds).toEqual(['usr_1']);
  });
});
