import type { ApiEnv } from '../config/env';
import { ApiError } from '../shared/errors';

export interface R2UploadInput {
  key: string;
  body: ArrayBuffer;
  contentType: string;
}

export interface R2StoredObject {
  body: ReadableStream;
  contentType: string;
}

function getBucket(env: ApiEnv): R2Bucket {
  if (!env.BUCKET) {
    throw new ApiError('R2_NOT_CONFIGURED', 'El almacenamiento R2 no esta configurado.', 500);
  }

  return env.BUCKET;
}

export async function uploadObject(env: ApiEnv, input: R2UploadInput): Promise<void> {
  // R2 guarda archivos binarios; D1 solo conserva keys internas para evitar
  // inflar la base de datos y mantener consultas transaccionales ligeras.
  await getBucket(env).put(input.key, input.body, {
    httpMetadata: {
      contentType: input.contentType,
    },
  });
}

export async function getObject(env: ApiEnv, key: string): Promise<R2StoredObject> {
  const object = await getBucket(env).get(key);

  if (!object) {
    throw new ApiError('R2_OBJECT_NOT_FOUND', 'El archivo no existe en R2.', 404);
  }

  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
  };
}

export async function deleteObject(env: ApiEnv, key: string): Promise<void> {
  await getBucket(env).delete(key);
}

export function buildInternalKey(parts: string[]): string {
  return parts
    .map((part) =>
      part
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-'),
    )
    .filter(Boolean)
    .join('/');
}
