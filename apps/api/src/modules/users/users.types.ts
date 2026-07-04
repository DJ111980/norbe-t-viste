import type { UserRole } from '../auth/auth.types';

export type UserStatus = 'ACTIVO' | 'INACTIVO';

export interface UserRecord {
  id_usuario: string;
  nombre_completo: string;
  nombre_usuario: string;
  correo: string;
  contrasena_hash: string;
  rol: UserRole;
  estado: UserStatus;
  ultimo_acceso: string | null;
  creado_en: string;
  actualizado_en: string;
  debe_cambiar_contrasena: number;
  contrasena_actualizada_en: string | null;
  creado_por: string | null;
}

export interface PublicUser {
  idUsuario: string;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  rol: UserRole;
  estado: UserStatus;
  ultimoAcceso: string | null;
  creadoEn: string;
  actualizadoEn: string;
  debeCambiarContrasena: boolean;
  contrasenaActualizadaEn: string | null;
  creadoPor: string | null;
}

export interface CreateUserInput {
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  rol: UserRole;
  contrasena: string;
}

export interface UpdateUserInput {
  nombreCompleto?: string;
  nombreUsuario?: string;
  correo?: string;
  rol?: UserRole;
}

export interface UpdateUserStatusInput {
  estado: UserStatus;
}

export interface ResetUserPasswordInput {
  nuevaContrasena: string;
}
