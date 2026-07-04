import { USER_ROLES, type UserRole } from '../auth/auth.types';
import { ApiError } from '../../shared/errors';
import type {
  CreateUserInput,
  ResetUserPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserStatus,
} from './users.types';

const VALID_STATUSES: UserStatus[] = ['ACTIVO', 'INACTIVO'];

interface RawCreateUserBody {
  nombre_completo?: unknown;
  nombre_usuario?: unknown;
  correo?: unknown;
  rol?: unknown;
  contrasena?: unknown;
}

interface RawUpdateUserBody {
  nombre_completo?: unknown;
  nombre_usuario?: unknown;
  correo?: unknown;
  rol?: unknown;
}

interface RawUpdateStatusBody {
  estado?: unknown;
}

interface RawResetPasswordBody {
  nueva_contrasena?: unknown;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validatePasswordPolicy(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('La contrasena debe tener minimo 8 caracteres.');
  }

  if (!/[A-Za-zÀ-ÿ]/.test(password)) {
    errors.push('La contrasena debe incluir al menos una letra.');
  }

  if (!/\d/.test(password)) {
    errors.push('La contrasena debe incluir al menos un numero.');
  }

  return errors;
}

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError('INVALID_EMAIL', 'El correo no tiene un formato valido.', 400);
  }
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new ApiError(
      'INVALID_USERNAME',
      'El usuario debe tener entre 3 y 40 caracteres y usar letras, numeros, punto, guion o guion bajo.',
      400,
    );
  }
}

function validateRole(role: unknown): UserRole {
  if (typeof role !== 'string' || !USER_ROLES.includes(role as UserRole)) {
    throw new ApiError('INVALID_ROLE', 'El rol del usuario no es valido.', 400);
  }

  return role as UserRole;
}

function validatePassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw new ApiError('INVALID_PASSWORD', 'La contrasena es obligatoria.', 400);
  }

  const errors = validatePasswordPolicy(password);

  if (errors.length > 0) {
    throw new ApiError('WEAK_PASSWORD', errors.join(' '), 400);
  }

  return password;
}

export function validateCreateUserInput(body: unknown): CreateUserInput {
  const rawBody = body as RawCreateUserBody;
  const nombreCompleto =
    typeof rawBody?.nombre_completo === 'string' ? rawBody.nombre_completo.trim() : '';
  const correo = typeof rawBody?.correo === 'string' ? normalizeEmail(rawBody.correo) : '';
  const nombreUsuario =
    typeof rawBody?.nombre_usuario === 'string' ? normalizeUsername(rawBody.nombre_usuario) : '';

  if (!nombreCompleto) {
    throw new ApiError('INVALID_USER_NAME', 'El nombre completo es obligatorio.', 400);
  }

  if (!correo) {
    throw new ApiError('INVALID_EMAIL', 'El correo es obligatorio.', 400);
  }

  if (!nombreUsuario) {
    throw new ApiError('INVALID_USERNAME', 'El usuario es obligatorio.', 400);
  }

  validateEmail(correo);
  validateUsername(nombreUsuario);

  return {
    nombreCompleto,
    nombreUsuario,
    correo,
    rol: validateRole(rawBody.rol),
    contrasena: validatePassword(rawBody.contrasena),
  };
}

export function validateUpdateUserInput(body: unknown): UpdateUserInput {
  const rawBody = body as RawUpdateUserBody;
  const input: UpdateUserInput = {};

  if (typeof rawBody?.nombre_completo === 'string') {
    const nombreCompleto = rawBody.nombre_completo.trim();

    if (!nombreCompleto) {
      throw new ApiError('INVALID_USER_NAME', 'El nombre completo no puede estar vacio.', 400);
    }

    input.nombreCompleto = nombreCompleto;
  }

  if (typeof rawBody?.correo === 'string') {
    const correo = normalizeEmail(rawBody.correo);
    validateEmail(correo);
    input.correo = correo;
  }

  if (typeof rawBody?.nombre_usuario === 'string') {
    const nombreUsuario = normalizeUsername(rawBody.nombre_usuario);
    validateUsername(nombreUsuario);
    input.nombreUsuario = nombreUsuario;
  }

  if (rawBody?.rol !== undefined) {
    input.rol = validateRole(rawBody.rol);
  }

  if (Object.keys(input).length === 0) {
    throw new ApiError('EMPTY_UPDATE', 'Debes enviar al menos un campo para actualizar.', 400);
  }

  return input;
}

export function validateUpdateUserStatusInput(body: unknown): UpdateUserStatusInput {
  const rawBody = body as RawUpdateStatusBody;

  if (
    typeof rawBody?.estado !== 'string' ||
    !VALID_STATUSES.includes(rawBody.estado as UserStatus)
  ) {
    throw new ApiError('INVALID_USER_STATUS', 'El estado del usuario no es valido.', 400);
  }

  return {
    estado: rawBody.estado as UserStatus,
  };
}

export function validateResetUserPasswordInput(body: unknown): ResetUserPasswordInput {
  const rawBody = body as RawResetPasswordBody;

  return {
    nuevaContrasena: validatePassword(rawBody?.nueva_contrasena),
  };
}
