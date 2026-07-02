import { ApiError } from '../../shared/errors';
import type { LogoUploadInput } from './branding.types';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const;

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
