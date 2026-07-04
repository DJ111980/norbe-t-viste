import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { createUser, resetUserPassword, updateUser, updateUserStatus, listUsers } from './users';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
}));

describe('users service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista usuarios sin exponer hash de contrasena desde frontend', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ usuarios: [] });

    await listUsers('token');

    expect(apiRequest).toHaveBeenCalledWith('/usuarios', { token: 'token' });
  });

  it('crea y edita usuario con campos reales', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ usuario: { idUsuario: 'usr_1' } })
      .mockResolvedValueOnce({ usuario: { idUsuario: 'usr_1' } });

    await createUser('token', {
      nombre_completo: 'Demo',
      correo: 'demo@example.com',
      rol: 'VENDEDOR',
      contrasena: 'demo1234',
    });
    await updateUser('token', 'usr_1', {
      nombre_completo: 'Demo Editado',
      correo: 'demo2@example.com',
      rol: 'ADMINISTRADOR',
    });

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/usuarios', {
      method: 'POST',
      token: 'token',
      body: {
        nombre_completo: 'Demo',
        correo: 'demo@example.com',
        rol: 'VENDEDOR',
        contrasena: 'demo1234',
      },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/usuarios/usr_1', {
      method: 'PATCH',
      token: 'token',
      body: {
        nombre_completo: 'Demo Editado',
        correo: 'demo2@example.com',
        rol: 'ADMINISTRADOR',
      },
    });
  });

  it('cambia estado y contrasena por endpoints separados', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ usuario: { idUsuario: 'usr_1' } })
      .mockResolvedValueOnce({ usuario: { idUsuario: 'usr_1' } });

    await updateUserStatus('token', 'usr_1', 'INACTIVO');
    await resetUserPassword('token', 'usr_1', { nueva_contrasena: 'nueva123' });

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/usuarios/usr_1/estado', {
      method: 'PATCH',
      token: 'token',
      body: { estado: 'INACTIVO' },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/usuarios/usr_1/contrasena', {
      method: 'PATCH',
      token: 'token',
      body: { nueva_contrasena: 'nueva123' },
    });
  });
});
