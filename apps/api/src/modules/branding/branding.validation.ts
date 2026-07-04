import { ApiError } from '../../shared/errors';
import type { LogoUploadInput, UpdateBrandingInput } from './branding.types';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const;

interface RawUpdateBrandingBody {
  nombre_negocio?: unknown;
  eslogan?: unknown;
  descripcion_login?: unknown;
  color_principal?: unknown;
}

function getExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  return extension && extension !== filename.toLowerCase() ? extension : '';
}

export async function validateLogoUploadRequest(request: Request): Promise<LogoUploadInput> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw new ApiError(
      'INVALID_FORM_DATA',
      'La solicitud debe enviarse como multipart/form-data.',
      400,
    );
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new ApiError('LOGO_FILE_REQUIRED', 'Debes enviar un archivo de imagen.', 400);
  }

  const contentType = file.type;

  if (!Object.keys(ALLOWED_IMAGE_TYPES).includes(contentType)) {
    // SVG se rechaza aunque sea imagen porque puede incluir scripts o contenido activo.
    throw new ApiError('INVALID_LOGO_MIME', 'El tipo de imagen del logo no es valido.', 400);
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new ApiError('LOGO_TOO_LARGE', 'El logo no puede superar 5 MB.', 400);
  }

  const extension = getExtension(file.name);
  const allowedExtensions = ALLOWED_IMAGE_TYPES[contentType as keyof typeof ALLOWED_IMAGE_TYPES];

  if (!(allowedExtensions as readonly string[]).includes(extension)) {
    throw new ApiError(
      'INVALID_LOGO_EXTENSION',
      'La extension del logo no coincide con el tipo permitido.',
      400,
    );
  }

  return {
    file,
    extension: extension as LogoUploadInput['extension'],
    contentType: contentType as LogoUploadInput['contentType'],
    size: file.size,
  };
}

function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ApiError('INVALID_BRANDING_FIELD', `${field} no es valido.`, 400);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ApiError('INVALID_BRANDING_FIELD', `${field} no puede estar vacio.`, 400);
  }

  if (trimmed.length > maxLength) {
    throw new ApiError('INVALID_BRANDING_FIELD', `${field} es demasiado largo.`, 400);
  }

  return trimmed;
}

export function validateUpdateBrandingInput(body: unknown): UpdateBrandingInput {
  const rawBody = body as RawUpdateBrandingBody;
  const input: UpdateBrandingInput = {};

  input.nombreNegocio = optionalText(rawBody?.nombre_negocio, 'El nombre del negocio', 80);
  input.eslogan = optionalText(rawBody?.eslogan, 'El eslogan', 120);
  input.descripcionLogin = optionalText(rawBody?.descripcion_login, 'La descripcion de login', 180);

  if (rawBody?.color_principal !== undefined) {
    if (
      typeof rawBody.color_principal !== 'string' ||
      !/^#[0-9a-fA-F]{6}$/.test(rawBody.color_principal.trim())
    ) {
      throw new ApiError('INVALID_BRANDING_COLOR', 'El color principal no es valido.', 400);
    }

    input.colorPrincipal = rawBody.color_principal.trim().toLowerCase();
  }

  if (Object.values(input).every((value) => value === undefined)) {
    throw new ApiError('EMPTY_BRANDING_UPDATE', 'Debes enviar al menos un campo.', 400);
  }

  return input;
}
