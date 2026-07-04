import { describe, expect, it } from 'vitest';
import type { UserAccount } from '../types';
import { toUserUpdateForm } from './UsersPage';

function user(): UserAccount {
  return {
    idUsuario: 'usr_1',
    nombreCompleto: 'Demo',
    correo: 'demo@example.com',
    rol: 'VENDEDOR',
    estado: 'ACTIVO',
    ultimoAcceso: null,
    creadoEn: '2026-01-01',
    actualizadoEn: '2026-01-01',
    debeCambiarContrasena: false,
    contrasenaActualizadaEn: null,
    creadoPor: null,
  };
}

describe('UsersPage helpers', () => {
  it('edicion normal no incluye contrasena ni hash', () => {
    expect(toUserUpdateForm(user())).toEqual({
      nombre_completo: 'Demo',
      correo: 'demo@example.com',
      rol: 'VENDEDOR',
    });
  });
});
