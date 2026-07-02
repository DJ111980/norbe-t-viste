import { ApiError } from './errors';

export function ensureMethod(request: Request, expectedMethod: string): void {
  if (request.method !== expectedMethod) {
    throw new ApiError('METHOD_NOT_ALLOWED', 'Metodo HTTP no permitido para esta ruta.', 405);
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError('INVALID_JSON', 'El cuerpo de la solicitud debe ser JSON valido.', 400);
  }
}
