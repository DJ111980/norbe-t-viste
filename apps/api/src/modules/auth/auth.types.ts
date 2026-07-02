export const USER_ROLES = ['ADMINISTRADOR', 'VENDEDOR'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserRecord {
  id_usuario: string;
  nombre_completo: string;
  correo: string;
  contrasena_hash: string;
  rol: UserRole;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimo_acceso?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  debe_cambiar_contrasena?: number;
  contrasena_actualizada_en?: string | null;
  creado_por?: string | null;
}

export interface AuthenticatedUser {
  idUsuario: string;
  nombreCompleto: string;
  correo: string;
  rol: UserRole;
}

export interface LoginInput {
  correo: string;
  contrasena: string;
}

export interface AccessTokenClaims {
  sub: string;
  correo: string;
  rol: UserRole;
  typ: 'access';
}
