import type { ApiEnv } from '../../config/env';
import { ApiError } from '../../shared/errors';
import { buildInternalKey, deleteObject, getObject, uploadObject } from '../../services/r2';
import { toPublicLogo } from './branding.mapper';
import * as brandingRepository from './branding.repository';
import type { LogoUploadInput, PublicLogo } from './branding.types';

function buildLogoKey(extension: string): string {
  return buildInternalKey(['branding', 'logo', `${crypto.randomUUID()}.${extension}`]);
}

export async function getLogo(env: ApiEnv): Promise<PublicLogo | null> {
  return toPublicLogo(await brandingRepository.getBusinessConfig(env));
}

export async function uploadLogo(env: ApiEnv, input: LogoUploadInput): Promise<PublicLogo> {
  const config = await brandingRepository.ensureBusinessConfig(env);
  const previousLogoKey = config.logo_imagen;
  const nextLogoKey = buildLogoKey(input.extension);

  // El logo vive en R2; D1 conserva solo la key. Esta fase implementa branding,
  // no imagenes de productos, variantes ni QR como archivo.
  await uploadObject(env, {
    key: nextLogoKey,
    body: await input.file.arrayBuffer(),
    contentType: input.contentType,
  });

  const updatedConfig = await brandingRepository.updateLogoKey(
    env,
    config.id_configuracion,
    nextLogoKey,
  );

  if (previousLogoKey) {
    await deleteObject(env, previousLogoKey);
  }

  return toPublicLogo(updatedConfig) as PublicLogo;
}

export async function deleteLogo(env: ApiEnv): Promise<PublicLogo | null> {
  const config = await brandingRepository.ensureBusinessConfig(env);

  if (!config.logo_imagen) {
    return null;
  }

  const previousLogoKey = config.logo_imagen;
  const updatedConfig = await brandingRepository.updateLogoKey(env, config.id_configuracion, null);

  await deleteObject(env, previousLogoKey);

  return toPublicLogo(updatedConfig);
}

export async function getLogoFile(env: ApiEnv): Promise<Response> {
  const logo = await getLogo(env);

  if (!logo) {
    throw new ApiError('LOGO_NOT_CONFIGURED', 'El logo del negocio no esta configurado.', 404);
  }

  const object = await getObject(env, logo.key);

  return new Response(object.body, {
    headers: {
      'content-type': object.contentType,
      'cache-control': 'private, max-age=300',
    },
  });
}
