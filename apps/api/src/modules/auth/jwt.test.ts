import { describe, expect, it } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { createAccessToken, verifyAccessToken } from './jwt';

const env = {
  JWT_SECRET: 'secret-local-solo-para-pruebas',
  JWT_EXPIRES_IN: '1h',
} as ApiEnv;

describe('jwt auth', () => {
  it('firma y verifica un JWT valido', async () => {
    const token = await createAccessToken(env, {
      sub: 'usr_1',
      correo: 'admin@norbe.test',
      rol: 'ADMINISTRADOR',
      typ: 'access',
    });

    await expect(verifyAccessToken(env, token)).resolves.toEqual({
      sub: 'usr_1',
      correo: 'admin@norbe.test',
      rol: 'ADMINISTRADOR',
      typ: 'access',
    });
  });

  it('rechaza un JWT invalido', async () => {
    await expect(verifyAccessToken(env, 'token-invalido')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
      status: 401,
    });
  });
});
