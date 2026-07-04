import type { ApiEnv } from '../../config/env';
import type { BusinessConfigRecord } from './branding.types';

const DEFAULT_CONFIG_ID = 'configuracion_principal';
const DEFAULT_BUSINESS_NAME = 'NORBE T VISTE';
const DEFAULT_SLOGAN = 'Gestion comercial';
const DEFAULT_LOGIN_DESCRIPTION = 'Gestion comercial lista para operar desde el navegador.';
const DEFAULT_PRIMARY_COLOR = '#b0181b';

export async function getBusinessConfig(env: ApiEnv): Promise<BusinessConfigRecord | null> {
  return env.DB.prepare(
    `
      SELECT
        id_configuracion,
        nombre_negocio,
        eslogan,
        descripcion_login,
        color_principal,
        logo_imagen
      FROM configuracion_negocio
      ORDER BY creado_en ASC
      LIMIT 1
    `,
  ).first<BusinessConfigRecord>();
}

export async function ensureBusinessConfig(env: ApiEnv): Promise<BusinessConfigRecord> {
  const currentConfig = await getBusinessConfig(env);

  if (currentConfig) {
    return currentConfig;
  }

  await env.DB.prepare(
    `
      INSERT INTO configuracion_negocio (
        id_configuracion,
        nombre_negocio,
        eslogan,
        descripcion_login,
        color_principal,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(
      DEFAULT_CONFIG_ID,
      DEFAULT_BUSINESS_NAME,
      DEFAULT_SLOGAN,
      DEFAULT_LOGIN_DESCRIPTION,
      DEFAULT_PRIMARY_COLOR,
    )
    .run();

  return (await getBusinessConfig(env)) as BusinessConfigRecord;
}

export async function updateBusinessConfig(
  env: ApiEnv,
  idConfiguracion: string,
  input: {
    nombreNegocio?: string;
    eslogan?: string;
    descripcionLogin?: string;
    colorPrincipal?: string;
  },
): Promise<BusinessConfigRecord> {
  const assignments: string[] = [];
  const values: string[] = [];

  if (input.nombreNegocio !== undefined) {
    assignments.push('nombre_negocio = ?');
    values.push(input.nombreNegocio);
  }

  if (input.eslogan !== undefined) {
    assignments.push('eslogan = ?');
    values.push(input.eslogan);
  }

  if (input.descripcionLogin !== undefined) {
    assignments.push('descripcion_login = ?');
    values.push(input.descripcionLogin);
  }

  if (input.colorPrincipal !== undefined) {
    assignments.push('color_principal = ?');
    values.push(input.colorPrincipal);
  }

  assignments.push("actualizado_en = datetime('now')");

  await env.DB.prepare(
    `
      UPDATE configuracion_negocio
      SET ${assignments.join(', ')}
      WHERE id_configuracion = ?
    `,
  )
    .bind(...values, idConfiguracion)
    .run();

  return (await getBusinessConfig(env)) as BusinessConfigRecord;
}

export async function updateLogoKey(
  env: ApiEnv,
  idConfiguracion: string,
  logoKey: string | null,
): Promise<BusinessConfigRecord> {
  await env.DB.prepare(
    `
      UPDATE configuracion_negocio
      SET logo_imagen = ?,
          actualizado_en = datetime('now')
      WHERE id_configuracion = ?
    `,
  )
    .bind(logoKey, idConfiguracion)
    .run();

  return (await getBusinessConfig(env)) as BusinessConfigRecord;
}
