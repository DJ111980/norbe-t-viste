import { ApiError } from '../../shared/errors';
import type { ImageUploadInput } from './images.types';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const;

function getExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  return extension && extension !== filename.toLowerCase() ? extension : '';
}

export async function validateImageUploadRequest(request: Request): Promise<ImageUploadInput> {
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
    throw new ApiError('IMAGE_FILE_REQUIRED', 'Debes enviar un archivo de imagen.', 400);
  }

  if (!Object.keys(ALLOWED_IMAGE_TYPES).includes(file.type)) {
    // SVG se rechaza porque puede incluir scripts o contenido activo.
    throw new ApiError('INVALID_IMAGE_MIME', 'El tipo de imagen no es valido.', 400);
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ApiError('IMAGE_TOO_LARGE', 'La imagen no puede superar 5 MB.', 400);
  }

  const extension = getExtension(file.name);
  const allowedExtensions = ALLOWED_IMAGE_TYPES[file.type as keyof typeof ALLOWED_IMAGE_TYPES];

  if (!(allowedExtensions as readonly string[]).includes(extension)) {
    throw new ApiError(
      'INVALID_IMAGE_EXTENSION',
      'La extension de la imagen no coincide con el tipo permitido.',
      400,
    );
  }

  return {
    file,
    extension: extension as ImageUploadInput['extension'],
    contentType: file.type as ImageUploadInput['contentType'],
    size: file.size,
  };
}
