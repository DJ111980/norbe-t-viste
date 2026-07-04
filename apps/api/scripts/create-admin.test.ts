import { describe, expect, it } from 'vitest';
import {
  buildInsertAdminSql,
  normalizeAdminEmail,
  readAdminSeedInput,
  validateAdminPassword,
} from './create-admin';

describe('create admin script helpers', () => {
  it('normaliza el correo a minusculas', () => {
    expect(normalizeAdminEmail(' ADMIN@NORBE.TEST ')).toBe('admin@norbe.test');
  });

  it('valida la politica minima de contrasena', () => {
    expect(validateAdminPassword('abc')).toEqual([
      'La contrasena debe tener minimo 8 caracteres.',
      'La contrasena debe incluir al menos un numero.',
    ]);
    expect(validateAdminPassword('clave123')).toEqual([]);
  });

  it('rechaza datos incompletos', () => {
    expect(() => readAdminSeedInput({})).toThrow('Faltan variables requeridas');
  });

  it('prepara los datos desde variables de entorno sin cambiar la contrasena', () => {
    expect(
      readAdminSeedInput({
        ADMIN_SEED_NAME: 'Admin Principal',
        ADMIN_SEED_EMAIL: ' ADMIN@NORBE.TEST ',
        ADMIN_SEED_PASSWORD: 'clave123',
      }),
    ).toEqual({
      nombreCompleto: 'Admin Principal',
      nombreUsuario: 'admin',
      correo: 'admin@norbe.test',
      contrasena: 'clave123',
    });
  });

  it('escapa valores SQL para evitar duplicados o rupturas por comillas', () => {
    const sql = buildInsertAdminSql(
      {
        nombreCompleto: "Admin O'Connor",
        nombreUsuario: 'admin',
        correo: "admin'o@norbe.test",
        contrasena: 'clave123',
      },
      "hash'valor",
      'usr_1',
    );

    expect(sql).toContain("Admin O''Connor");
    expect(sql).toContain("admin''o@norbe.test");
    expect(sql).toContain("hash''valor");
    expect(sql).toContain("'ADMINISTRADOR'");
    expect(sql).toContain("'ACTIVO'");
  });
});
