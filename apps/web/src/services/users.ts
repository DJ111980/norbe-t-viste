import { apiRequest } from '../lib/api';
import type {
  UserAccount,
  UserFormValues,
  UserPasswordFormValues,
  UserStatus,
  UserUpdateFormValues,
} from '../types';

interface ListUsersResponse {
  usuarios: UserAccount[];
}

interface UserResponse {
  usuario: UserAccount;
}

function toCreateBody(values: UserFormValues) {
  return {
    nombre_completo: values.nombre_completo,
    nombre_usuario: values.nombre_usuario,
    correo: values.correo,
    rol: values.rol,
    contrasena: values.contrasena,
  };
}

function toUpdateBody(values: UserUpdateFormValues) {
  return {
    nombre_completo: values.nombre_completo,
    nombre_usuario: values.nombre_usuario,
    correo: values.correo,
    rol: values.rol,
  };
}

export async function listUsers(token: string): Promise<UserAccount[]> {
  const data = await apiRequest<ListUsersResponse>('/usuarios', { token });

  return data.usuarios;
}

export async function getUser(token: string, idUsuario: string): Promise<UserAccount> {
  const data = await apiRequest<UserResponse>(`/usuarios/${idUsuario}`, { token });

  return data.usuario;
}

export async function createUser(token: string, values: UserFormValues): Promise<UserAccount> {
  const data = await apiRequest<UserResponse, ReturnType<typeof toCreateBody>>('/usuarios', {
    method: 'POST',
    token,
    body: toCreateBody(values),
  });

  return data.usuario;
}

export async function updateUser(
  token: string,
  idUsuario: string,
  values: UserUpdateFormValues,
): Promise<UserAccount> {
  const data = await apiRequest<UserResponse, ReturnType<typeof toUpdateBody>>(
    `/usuarios/${idUsuario}`,
    {
      method: 'PATCH',
      token,
      body: toUpdateBody(values),
    },
  );

  return data.usuario;
}

export async function updateUserStatus(
  token: string,
  idUsuario: string,
  estado: UserStatus,
): Promise<UserAccount> {
  const data = await apiRequest<UserResponse, { estado: UserStatus }>(
    `/usuarios/${idUsuario}/estado`,
    {
      method: 'PATCH',
      token,
      body: { estado },
    },
  );

  return data.usuario;
}

export async function resetUserPassword(
  token: string,
  idUsuario: string,
  values: UserPasswordFormValues,
): Promise<UserAccount> {
  const data = await apiRequest<UserResponse, UserPasswordFormValues>(
    `/usuarios/${idUsuario}/contrasena`,
    {
      method: 'PATCH',
      token,
      body: values,
    },
  );

  return data.usuario;
}
