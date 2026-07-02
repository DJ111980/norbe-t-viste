import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { successResponse } from '../../shared/responses';
import { ensureMethod } from '../../shared/validation';
import {
  deleteProductImage,
  deleteVariantImage,
  getProductImage,
  getProductImageFile,
  getVariantImage,
  getVariantImageFile,
  uploadProductImage,
  uploadVariantImage,
} from './images.service';
import { validateImageUploadRequest } from './images.validation';

function matchProductImagePath(pathname: string): { idProducto: string; file: boolean } | null {
  const match = pathname.match(/^\/productos\/([^/]+)\/imagen(?:\/(file))?$/);

  if (!match) return null;

  return {
    idProducto: decodeURIComponent(match[1]),
    file: match[2] === 'file',
  };
}

function matchVariantImagePath(pathname: string): { idVariante: string; file: boolean } | null {
  const match = pathname.match(/^\/variantes\/([^/]+)\/imagen(?:\/(file))?$/);

  if (!match) return null;

  return {
    idVariante: decodeURIComponent(match[1]),
    file: match[2] === 'file',
  };
}

export async function handleImageRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const productImagePath = matchProductImagePath(url.pathname);

  if (productImagePath) {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      if (productImagePath.file) {
        return getProductImageFile(env, productImagePath.idProducto);
      }

      return successResponse({
        productoImagen: await getProductImage(env, productImagePath.idProducto),
      });
    }

    if (!productImagePath.file && request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);
      const input = await validateImageUploadRequest(request);

      return successResponse(
        {
          productoImagen: await uploadProductImage(env, productImagePath.idProducto, input),
        },
        201,
      );
    }

    if (!productImagePath.file && request.method === 'DELETE') {
      requireRole(auth, ['ADMINISTRADOR']);

      return successResponse({
        productoImagen: await deleteProductImage(env, productImagePath.idProducto),
      });
    }

    ensureMethod(request, 'GET');
  }

  const variantImagePath = matchVariantImagePath(url.pathname);

  if (variantImagePath) {
    const auth = await requireAuth(request, env);

    if (request.method === 'GET') {
      requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

      if (variantImagePath.file) {
        return getVariantImageFile(env, variantImagePath.idVariante);
      }

      return successResponse({
        varianteImagen: await getVariantImage(env, variantImagePath.idVariante),
      });
    }

    if (!variantImagePath.file && request.method === 'POST') {
      requireRole(auth, ['ADMINISTRADOR']);
      const input = await validateImageUploadRequest(request);

      return successResponse(
        {
          varianteImagen: await uploadVariantImage(env, variantImagePath.idVariante, input),
        },
        201,
      );
    }

    if (!variantImagePath.file && request.method === 'DELETE') {
      requireRole(auth, ['ADMINISTRADOR']);

      return successResponse({
        varianteImagen: await deleteVariantImage(env, variantImagePath.idVariante),
      });
    }

    ensureMethod(request, 'GET');
  }

  if (url.pathname.includes('/imagen')) {
    throw new ApiError('NOT_FOUND', 'La ruta solicitada no existe.', 404);
  }

  return null;
}
