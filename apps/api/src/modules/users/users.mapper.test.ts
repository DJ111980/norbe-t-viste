import { describe, expect, it } from 'vitest';
import { toPublicUser } from './users.mapper';
import type { UserRecord } from './users.types';

describe('users mapper', () => {
  it('respuesta publica no incluye contrasena_hash', () => {
    const publicUser = toPublicUser({
      id_usuario: 'usr_1',
      nombre_completo: 'Usuario',
      correo: 'usuario@norbe.test',
      contrasena_hash: 'hash-secreto',
      rol: 'VENDEDOR',
      estado: 'ACTIVO',
      ultimo_acceso: null,
      creado_en: '2026-01-01 00:00:00',
      actualizado_en: '2026-01-01 00:00:00',
      debe_cambiar_contrasena: 1,
      contrasena_actualizada_en: null,
      creado_por: 'usr_admin',
    } satisfies UserRecord);

    expect(publicUser).not.toHaveProperty('contrasena_hash');
    expect(JSON.stringify(publicUser)).not.toContain('hash-secreto');
  });
});
