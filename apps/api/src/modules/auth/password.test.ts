import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('valida una contrasena correcta', async () => {
    const hash = await hashPassword('Clave segura 123');

    await expect(verifyPassword('Clave segura 123', hash)).resolves.toBe(true);
  });

  it('rechaza una contrasena incorrecta', async () => {
    const hash = await hashPassword('Clave segura 123');

    await expect(verifyPassword('otra clave', hash)).resolves.toBe(false);
  });

  it('rechaza un formato de hash invalido', async () => {
    await expect(verifyPassword('Clave segura 123', 'hash-invalido')).resolves.toBe(false);
  });

  it('usa salt diferente para generar hashes distintos', async () => {
    const firstHash = await hashPassword('Clave segura 123');
    const secondHash = await hashPassword('Clave segura 123');

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword('Clave segura 123', firstHash)).resolves.toBe(true);
    await expect(verifyPassword('Clave segura 123', secondHash)).resolves.toBe(true);
  });
});
