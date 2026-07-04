import type { PublicUser, UserRecord } from './users.types';

export function toPublicUser(user: UserRecord): PublicUser {
  // Este mapper es la barrera para que contrasena_hash nunca salga por la API.
  return {
    idUsuario: user.id_usuario,
    nombreCompleto: user.nombre_completo,
    nombreUsuario: user.nombre_usuario,
    correo: user.correo,
    rol: user.rol,
    estado: user.estado,
    ultimoAcceso: user.ultimo_acceso,
    creadoEn: user.creado_en,
    actualizadoEn: user.actualizado_en,
    debeCambiarContrasena: user.debe_cambiar_contrasena === 1,
    contrasenaActualizadaEn: user.contrasena_actualizada_en,
    creadoPor: user.creado_por,
    avatar: {
      disponible: Boolean(user.avatar_key),
      contentType: user.avatar_content_type,
    },
  };
}
