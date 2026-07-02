import type { ApiEnv } from '../../config/env';
import type { BusinessConfigRecord } from './branding.types';

const DEFAULT_CONFIG_ID = 'configuracion_principal';
const DEFAULT_BUSINESS_NAME = 'NORBE T VISTE';

export async function getBusinessConfig(env: ApiEnv): Promise<BusinessConfigRecord | null> {
  return env.DB.prepare(
    `
      SELECT id_configuracion, nombre_negocio, logo_imagen
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
        creado_en,
        actualizado_en
      ) VALUES (?, ?, datetime('now'), datetime('now'))
    `,
  )
    .bind(DEFAULT_CONFIG_ID, DEFAULT_BUSINESS_NAME)
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
